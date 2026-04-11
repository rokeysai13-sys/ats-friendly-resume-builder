"""
ATS Analysis Service — Phase 2 (Gemini-powered)

Sends the user's resume + job description to Google Gemini and
returns a structured ATS compatibility report.
"""

import json
import logging
import os
import re
from typing import Any

from google import genai
from google.genai import types as genai_types

from flask import current_app
from app.common.errors import AppError, LLM_UNAVAILABLE, RESUME_EMPTY, JD_TOO_SHORT

logger = logging.getLogger(__name__)

# ── Prompt template ──────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a strict, senior technical recruiter who evaluates resumes against \
job descriptions for ATS (Applicant Tracking System) compatibility.

RULES:
1. Compare the RESUME DATA against the JOB DESCRIPTION.
2. Identify every keyword, skill, certification, and technology mentioned \
   in the job description.
3. Check which of those appear (or have close synonyms) in the resume.
4. Calculate an integer ATS match score from 0‒100.
5. Return ONLY a valid, raw JSON object — no markdown, no code fences, no \
   explanation.  Strictly use this schema:

{
  "score": <int 0-100>,
  "found_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword3", "keyword4"],
  "suggestions": [
    "Add Docker experience to your skills section.",
    "Quantify your Python project impact with metrics."
  ]
}
"""

_USER_PROMPT_TEMPLATE = """\
=== RESUME DATA ===
{resume_text}

=== JOB DESCRIPTION ===
{job_description}

Analyze the resume against the job description and return the JSON result.
"""

# ── Fallback (offline / error) ───────────────────────────────────────────────

_FALLBACK_RESULT: dict[str, Any] = {
    "score": 0,
    "found_keywords": [],
    "missing_keywords": [],
    "suggestions": ["ATS analysis is temporarily unavailable. Please try again later."],
}

_STOP_WORDS = {
    "about", "after", "again", "against", "all", "also", "and", "any", "are", "because",
    "been", "before", "being", "between", "both", "could", "from", "have", "into", "more",
    "most", "must", "other", "over", "such", "than", "that", "their", "there", "these",
    "they", "this", "those", "through", "under", "with", "without", "your", "will", "would",
}

_NOISE_KEYWORDS = {
    "ability", "accessible", "additional", "all", "applications", "apply", "architecture",
    "boundaries", "class", "collaborate", "connected", "create", "customer", "cutting-edge",
    "description", "design", "develop", "digital", "drives", "edge", "embedded", "enable",
    "engineer", "engineers", "etc", "experience", "experiences", "future", "hardware", "help",
    "information", "innovator", "years",
}

_GENERIC_SINGLE_WORDS = {
    "advancing", "allow", "amount", "allows", "across", "along", "among", "around",
    "basic", "bachelor", "better", "billions", "build", "building", "business", "capabilities", "capable", "commercialization", "computer", "deliver", "delivering",
    "driven", "effective", "efficient", "enablement", "ensuring", "focus", "focused", "function",
    "general", "global", "growth", "improve", "improving", "include", "including", "leading",
    "maintain", "maintaining", "manage", "managing", "modern", "optimize", "optimizing",
    "process", "processes", "product", "quality", "reliable", "responsible", "results",
    "scale", "scalable", "support", "supporting", "systems", "tools", "value", "work", "working",
    "workflow", "workflows", "aimet", "aisw",
}

# Preserve known technical terms even if they are short or look dictionary-like.
_TECH_KEYWORD_WHITELIST = {
    "ai", "ml", "nlp", "llm", "api", "sdk", "ci", "cd", "git", "sql", "nosql", "etl",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible", "linux", "unix",
    "python", "java", "javascript", "typescript", "node", "react", "angular", "vue", "flask",
    "django", "fastapi", "spring", "dotnet", "csharp", "go", "golang", "rust", "kafka",
    "redis", "postgres", "postgresql", "mysql", "mongodb", "graphql", "rest", "grpc", "spark",
    "hadoop", "airflow", "pandas", "numpy", "pytorch", "tensorflow", "opencv",
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _resume_to_text(resume) -> str:
    """Convert a Resume ORM object into a plain-text block for the prompt."""
    lines: list[str] = []

    # Personal info
    name = resume.personal_name or ""
    lines.append(f"Name: {name}")
    if resume.personal_email:
        lines.append(f"Email: {resume.personal_email}")
    if resume.personal_phone:
        lines.append(f"Phone: {resume.personal_phone}")
    if resume.personal_location:
        lines.append(f"Location: {resume.personal_location}")
    if resume.personal_linkedin:
        lines.append(f"LinkedIn: {resume.personal_linkedin}")

    # Summary
    if resume.summary:
        lines.append(f"\nSummary:\n{resume.summary}")

    # Experience
    if resume.experience:
        lines.append("\nExperience:")
        for exp in resume.experience:
            period = f"{exp.start_date or ''} – {exp.end_date or 'Present'}"
            lines.append(f"  • {exp.role or 'Role'} at {exp.company or 'Company'} ({period})")
            if exp.description:
                lines.append(f"    {exp.description}")

    # Education
    if resume.education:
        lines.append("\nEducation:")
        for edu in resume.education:
            period = f"{edu.start_year or ''} – {edu.end_year or ''}"
            lines.append(f"  • {edu.degree or ''} — {edu.school or ''} ({period})")

    # Skills
    if resume.skills:
        skill_names = [s.skill_name for s in resume.skills if s.skill_name]
        lines.append(f"\nSkills: {', '.join(skill_names)}")

    # Projects
    if resume.projects:
        lines.append("\nProjects:")
        for proj in resume.projects:
            lines.append(f"  • {proj.title or 'Project'}: {proj.description or ''}")

    # Certificates
    if resume.certificates:
        lines.append("\nCertifications:")
        for cert in resume.certificates:
            lines.append(f"  • {cert.name or ''} — {cert.issuer or ''} ({cert.year or ''})")

    return "\n".join(lines)


def _parse_llm_json(raw_text: str) -> dict[str, Any]:
    """
    Robustly parse JSON from the LLM response, stripping markdown
    code fences if the model ignores our instruction.
    """
    text = raw_text.strip()

    # Strip ```json ... ``` wrappers
    if text.startswith("```"):
        # Remove first line (```json) and last line (```)
        text_lines = text.split("\n")
        text = "\n".join(text_lines[1:])
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]

    return json.loads(text)


def _normalize_keyword(keyword: str) -> str:
    return re.sub(r"\s+", " ", keyword.strip().lower().strip(".,;:!?()[]{}"))


def _is_low_signal_keyword(keyword: str) -> bool:
    if keyword in _GENERIC_SINGLE_WORDS:
        return True

    if " " in keyword:
        return False

    if keyword in _TECH_KEYWORD_WHITELIST:
        return False

    # Filter verb-like fluff words (e.g., "advancing", "optimizing") that often
    # appear in generated output but are not actionable ATS keywords.
    if keyword.endswith("ing") and len(keyword) >= 7:
        return True

    # Filter short lowercase acronyms/nonce tokens unless explicitly whitelisted.
    if re.fullmatch(r"[a-z]{3,5}", keyword):
        return True

    return False


def _filter_keywords(keywords: list[Any]) -> list[str]:
    seen: set[str] = set()
    filtered: list[str] = []

    for raw_keyword in keywords:
        if not isinstance(raw_keyword, str):
            continue

        keyword = _normalize_keyword(raw_keyword)
        if not keyword:
            continue

        if keyword in _STOP_WORDS or keyword in _NOISE_KEYWORDS:
            continue

        if _is_low_signal_keyword(keyword):
            continue

        if len(keyword) < 3:
            continue

        if keyword in seen:
            continue

        seen.add(keyword)
        filtered.append(keyword)

    return filtered


def _local_ats_fallback(resume_text: str, job_description: str, reason: str | None = None) -> dict[str, Any]:
    """Simple deterministic ATS estimate used when LLM provider is unavailable."""
    token_pattern = re.compile(r"[A-Za-z][A-Za-z0-9+#\-\.]{2,}")

    jd_tokens = {
        t.lower()
        for t in token_pattern.findall(job_description)
        if t.lower() not in _STOP_WORDS
    }
    resume_tokens = {
        t.lower()
        for t in token_pattern.findall(resume_text)
    }

    found = _filter_keywords(sorted(jd_tokens.intersection(resume_tokens)))
    missing = _filter_keywords(sorted(jd_tokens - resume_tokens))

    if not jd_tokens:
        score = 0
    else:
        score = int(round((len(found) / len(jd_tokens)) * 100))

    suggestions: list[str] = []
    if missing:
        top_missing = ", ".join(missing[:8])
        suggestions.append(f"Add missing keywords from the JD: {top_missing}.")
    suggestions.append("Quantify experience impact with metrics (%, $, time saved, scale).")
    if reason:
        # Avoid leaking provider internals (model names, API errors, quota details) to end users.
        suggestions.append("AI provider unavailable, using local fallback analysis.")

    return {
        "score": max(0, min(100, score)),
        "found_keywords": found[:30],
        "missing_keywords": missing[:30],
        "suggestions": suggestions[:5],
    }


# ── Public API ───────────────────────────────────────────────────────────────

def _generate_gemini_ats_payload(resume, job_description: str) -> dict[str, Any]:
    """
    Runs ATS analysis using Google Gemini.

    Parameters
    ----------
    resume : Resume ORM object
        The user's resume, fully loaded with relationships.
    job_description : str
        The raw job description text to match against.

    Returns
    -------
    dict with keys: score, found_keywords, missing_keywords, suggestions,
    analysis
    """
    # ── Input validation ─────────────────────────────────────────────────
    resume_text = _resume_to_text(resume)
    if len(resume_text.strip()) < 30:
        raise AppError(*RESUME_EMPTY, "Resume has too little content for analysis.")

    if not job_description or len(job_description.strip()) < 20:
        raise AppError(*JD_TOO_SHORT, "Job description is too short for meaningful analysis.")

    # ── Build the prompt ─────────────────────────────────────────────────
    user_prompt = _USER_PROMPT_TEMPLATE.format(
        resume_text=resume_text,
        job_description=job_description.strip(),
    )

    # ── Call Gemini ──────────────────────────────────────────────────────
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set; using local ATS fallback.")
        fallback = _local_ats_fallback(resume_text, job_description, "missing_api_key")
        fallback["analysis"] = fallback["suggestions"][0]
        return fallback

    model_name = current_app.config.get("LLM_MODEL", "gemini-2.5-flash")
    fallback_model = current_app.config.get("LLM_FALLBACK_MODEL", "gemini-2.5-flash")

    try:
        client = genai.Client(api_key=api_key)

        def _invoke(model_to_use: str):
            return client.models.generate_content(
                model=model_to_use,
                contents=user_prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    temperature=0.2,          # Low temp → deterministic JSON
                    max_output_tokens=1024,
                ),
            )

        try:
            response = _invoke(model_name)
        except Exception as exc:
            msg = str(exc)
            if model_name != fallback_model and ("NOT_FOUND" in msg or "not found" in msg):
                logger.warning(
                    "Configured model '%s' unavailable. Retrying with fallback '%s'.",
                    model_name,
                    fallback_model,
                )
                response = _invoke(fallback_model)
            else:
                raise

        raw_text = response.text
        logger.info("Gemini raw response length: %d chars", len(raw_text))

    except Exception as exc:
        logger.exception("Gemini API call failed: %s", exc)
        fallback = _local_ats_fallback(resume_text, job_description, "provider_error")
        fallback["analysis"] = fallback["suggestions"][0]
        return fallback

    # ── Parse the response ───────────────────────────────────────────────
    try:
        result = _parse_llm_json(raw_text)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Failed to parse Gemini JSON: %s\nRaw: %s", exc, raw_text[:500])
        raise AppError(*LLM_UNAVAILABLE, "AI returned an unparseable response. Try again.")

    # ── Validate schema shape ────────────────────────────────────────────
    required_keys = {"score", "found_keywords", "missing_keywords", "suggestions"}
    if not required_keys.issubset(result.keys()):
        missing = required_keys - result.keys()
        logger.error("Gemini response missing keys: %s", missing)
        raise AppError(*LLM_UNAVAILABLE, f"AI response incomplete, missing: {missing}")

    # Clamp the score
    result["score"] = max(0, min(100, int(result["score"])))

    # Remove generic terms from the model output so the UI stays focused on
    # actual skills instead of filler words.
    result["found_keywords"] = _filter_keywords(result.get("found_keywords", []))[:30]
    result["missing_keywords"] = _filter_keywords(result.get("missing_keywords", []))[:30]

    suggestions = result.get("suggestions", [])
    if isinstance(suggestions, list):
        cleaned_suggestions: list[str] = []
        for suggestion in suggestions:
            if isinstance(suggestion, str) and suggestion not in cleaned_suggestions:
                cleaned_suggestions.append(suggestion)
        result["suggestions"] = cleaned_suggestions[:5]

    analysis = result.get("analysis")
    if isinstance(analysis, str) and analysis.strip():
        result["analysis"] = analysis.strip()
    else:
        suggestions = result.get("suggestions", [])
        if isinstance(suggestions, list) and suggestions:
            first = suggestions[0]
            result["analysis"] = first if isinstance(first, str) else "Review the missing keywords and strengthen impact statements."
        else:
            result["analysis"] = "Review the missing keywords and strengthen impact statements."

    return result


def analyze_resume(resume, job_description: str) -> dict[str, Any]:
    """Backward-compatible wrapper for ATS analysis."""
    return _generate_gemini_ats_payload(resume, job_description)


def generate_professional_summary(resume, job_description: str = "") -> str:
    """
    Generate a concise professional summary for the given resume.

    Falls back to a deterministic local summary if the model is unavailable.
    """
    resume_text = _resume_to_text(resume)
    if len(resume_text.strip()) < 30:
        raise AppError(*RESUME_EMPTY, "Resume has too little content to generate summary.")

    def _local_summary() -> str:
        name = (resume.personal_name or "Candidate").strip()
        top_skills = [s.skill_name for s in (resume.skills or []) if s.skill_name][:4]
        top_skills_text = ", ".join(top_skills)

        if top_skills_text:
            return (
                f"{name} is a results-driven professional with hands-on experience in "
                f"{top_skills_text}. Delivers high-quality work, collaborates effectively across teams, "
                "and focuses on measurable business impact."
            )

        return (
            f"{name} is a results-driven professional focused on delivering reliable outcomes, "
            "cross-functional collaboration, and continuous improvement."
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set; using local summary fallback.")
        return _local_summary()

    model_name = current_app.config.get("LLM_MODEL", "gemini-2.5-flash")
    fallback_model = current_app.config.get("LLM_FALLBACK_MODEL", "gemini-2.5-flash")

    prompt = (
        "Write a professional resume summary in 3-4 lines. "
        "Tone: confident, concise, achievement-oriented. "
        "Do not use bullet points. Do not include placeholders. "
        "Return plain text only.\n\n"
        f"RESUME:\n{resume_text}\n\n"
        f"TARGET ROLE / JOB DESCRIPTION (optional):\n{job_description.strip() or 'Not provided'}"
    )

    try:
        client = genai.Client(api_key=api_key)

        def _invoke(model_to_use: str):
            return client.models.generate_content(
                model=model_to_use,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.35,
                    max_output_tokens=240,
                ),
            )

        try:
            response = _invoke(model_name)
        except Exception as exc:
            msg = str(exc)
            if model_name != fallback_model and ("NOT_FOUND" in msg or "not found" in msg):
                logger.warning(
                    "Configured summary model '%s' unavailable. Retrying with fallback '%s'.",
                    model_name,
                    fallback_model,
                )
                response = _invoke(fallback_model)
            else:
                raise

        summary = (response.text or "").strip()
        if not summary:
            return _local_summary()

        summary = re.sub(r"\s+", " ", summary).strip()
        return summary
    except Exception as exc:
        logger.exception("Summary generation failed: %s", exc)
        return _local_summary()
