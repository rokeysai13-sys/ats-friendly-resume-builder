import logging
from typing import Any, List

logger = logging.getLogger(__name__)

_kw_model = None
_sentence_model = None

def _get_models():
    """Lazily load the KeyBERT model."""
    global _kw_model, _sentence_model
    if _kw_model is None:
        try:
            from keybert import KeyBERT
            from sentence_transformers import SentenceTransformer
            logger.info("Loading all-MiniLM-L6-v2 embedding model...")
            
            # This is a highly efficient model for semantic matching
            model_name = 'all-MiniLM-L6-v2'
            _sentence_model = SentenceTransformer(model_name)
            
            # KeyBERT uses this underlying semantic model
            _kw_model = KeyBERT(model=_sentence_model)
        except Exception as e:
            logger.error(f"Failed to load KeyBERT: {e}")
            raise
    return _kw_model, _sentence_model

def _extract_phrases(text: str, kw_model) -> List[str]:
    """Extract unigram and bigram semantic keywords using KeyBERT."""
    if not text or len(text.strip()) < 5:
        return []
    
    # Extract unigrams and bigrams, picking top 30
    keywords_with_scores = kw_model.extract_keywords(
        text, 
        keyphrase_ngram_range=(1, 2), 
        stop_words=None, 
        top_n=30
    )
    
    phrases = [kw[0] for kw in keywords_with_scores]
    
    from app.resume.ats_service import _filter_keywords
    filtered_phrases = []
    
    for phrase in phrases:
        if " " not in phrase:
            # unigram, filter strictly
            if _filter_keywords([phrase]):
                filtered_phrases.append(phrase)
        else:
            # bigram, usually contextually sound
            filtered_phrases.append(phrase)
            
    return filtered_phrases

def generate_local_ml_analysis(resume_text: str, job_description: str) -> dict[str, Any]:
    """
    Generates an ATS analysis using local KeyBERT & all-MiniLM-L6-v2.
    """
    try:
        kw_model, sentence_model = _get_models()
    except Exception:
        # Fallback to empty if model fails to load (API will carry the bulk)
        return {"score": 0, "found_keywords": [], "missing_keywords": []}

    # 1. Extract raw keyword tokens
    try:
        jd_keywords = _extract_phrases(job_description, kw_model)
        resume_keywords = _extract_phrases(resume_text, kw_model)

        if not jd_keywords:
            return {"score": 0, "found_keywords": [], "missing_keywords": []}
        
        if not resume_keywords:
            return {"score": 0, "found_keywords": [], "missing_keywords": jd_keywords}

        # 2. Compute embeddings
        jd_embeddings = sentence_model.encode(jd_keywords, convert_to_tensor=True)
        resume_embeddings = sentence_model.encode(resume_keywords, convert_to_tensor=True)

        import torch
        from sentence_transformers import util
        
        # Matrix of [len(jd), len(resume)]
        cos_scores = util.cos_sim(jd_embeddings, resume_embeddings) 

        found_keywords = []
        missing_keywords = []

        SIMILARITY_THRESHOLD = 0.65  # Tunable threshold for equivalence

        for idx, jd_kw in enumerate(jd_keywords):
            # find the max similarity for this JD keyword against all Resume keywords
            max_score = torch.max(cos_scores[idx]).item()
            if max_score >= SIMILARITY_THRESHOLD:
                found_keywords.append(jd_kw)
            else:
                missing_keywords.append(jd_kw)

        score = 0
        if jd_keywords:
            score = int(round((len(found_keywords) / len(jd_keywords)) * 100))

        return {
            "score": score,
            "found_keywords": found_keywords,
            "missing_keywords": missing_keywords,
        }
    except Exception as e:
        logger.error(f"Local ML embedding failed: {e}")
        return {"score": 0, "found_keywords": [], "missing_keywords": []}
