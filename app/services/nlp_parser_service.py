import logging
import re
from typing import Any, Dict

logger = logging.getLogger(__name__)

_spacy_model = None
_bart_pipeline = None

def _get_spacy_model():
    """Lazily load the SpaCy NER model."""
    global _spacy_model
    if _spacy_model is None:
        try:
            import spacy
            logger.info("Loading spacy en_core_web_md model...")
            # We downgraded from trf to md because of missing Rust/MSVC compiler in Python 3.14 on Win
            _spacy_model = spacy.load("en_core_web_md")
        except Exception as e:
            logger.error(f"Failed to load SpaCy model: {e}")
            raise
    return _spacy_model

def _get_bart_pipeline():
    """Lazily load the Zero-Shot Classification pipeline."""
    global _bart_pipeline
    if _bart_pipeline is None:
        try:
            from transformers import pipeline
            logger.info("Loading facebook/bart-large-mnli model. This may take a while...")
            _bart_pipeline = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
        except Exception as e:
            logger.error(f"Failed to load BART pipeline: {e}")
            raise
    return _bart_pipeline

def parse_cv_text(text: str) -> Dict[str, Any]:
    """Parse raw CV text to extract Personal Info and Work Experience basic blocks."""
    if not text or len(text.strip()) < 10:
        return {}

    try:
        nlp = _get_spacy_model()
    except Exception:
        return {}

    doc = nlp(text)

    # 1. Regex Extractions (Phone & Email)
    email_pattern = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}"
    phone_pattern = r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"

    emails = re.findall(email_pattern, text)
    phones = re.findall(phone_pattern, text)

    email = emails[0] if emails else ""
    phone = phones[0] if phones else ""

    # 2. Extract Name (First PERSON entity usually is the candidate, if near the top)
    name = ""
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name = ent.text.strip()
            # Basic sanity check to avoid weird sentences being grabbed as names
            if len(name.split()) in [2, 3]: 
                break

    # 3. Extract Experience (Orgs and Dates)
    # Simple heuristic: pair an ORG with the closest DATE
    experience = []
    orgs = [ent for ent in doc.ents if ent.label_ == "ORG"]
    dates = [ent for ent in doc.ents if ent.label_ == "DATE"]

    # Match each organization to the chronologically closest date token in the text
    for org in orgs:
        # Find the closest date by character offset
        closest_date = None
        min_dist = float('inf')
        for d in dates:
            dist = abs(org.start_char - d.start_char)
            # Typically dates are written shortly after the company name in resumes
            if dist < 200 and dist < min_dist:
                min_dist = dist
                closest_date = d

        if closest_date:
            # Avoid dupes
            if not any(exp['company'] == org.text for exp in experience):
                experience.append({
                    "company": org.text,
                    "position": "Extracted Position", # NER doesn't do roles well, BART will help later
                    "start_date": closest_date.text,
                    "end_date": "Present",
                    "description": "Auto-parsed from CV."
                })

    return {
        "personal_info": {
            "name": name,
            "email": email,
            "phone": phone
        },
        "experience": experience
    }

def match_role(resume_text: str, candidate_labels: list[str]) -> dict[str, float]:
    """Matches the resume against potential roles using zero-shot classification."""
    if not resume_text or len(resume_text.strip()) < 50:
        return {}
    
    try:
        classifier = _get_bart_pipeline()
    except Exception:
        return {}

    # Truncate text to avoid model length limits (BART is 1024 tokens max)
    # The first 1500 chars usually contain enough "vibes" of their role.
    truncated_text = resume_text[:1500]
    
    result = classifier(truncated_text, candidate_labels)
    
    # result returns {'labels': [...], 'scores': [...]}
    match_percentages = {
        label: round(score * 100, 1) 
        for label, score in zip(result['labels'], result['scores'])
    }
    
    return match_percentages
