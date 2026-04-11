"""Gemini-backed AI services for ATS analysis."""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from flask import current_app
from google import genai
from google.genai import types as genai_types

from app.common.errors import AppError, JD_TOO_SHORT, LLM_UNAVAILABLE, RESUME_EMPTY
from app.resume.ats_service import _filter_keywords, _resume_to_text

logger = logging.getLogger(__name__)

_ATS_PROMPT = """\
You are a strict ATS analyst.

Return ONLY raw JSON and nothing else. No markdown. No code fences. No explanation.

Use this schema exactly:
{
  "score": 0,
  "missing_keywords": ["keyword1", "keyword2"],
  "analysis_summary": "Brief actionable advice.",
  "found_keywords": ["keyword3", "keyword4"]
}

Rules:
- score must be an integer from 0 to 100.
- missing_keywords must contain only concrete skills, tools, frameworks, or certifications.
- analysis_summary must be brief, direct, and actionable.
- Do not include generic filler words or personality adjectives.
"""

_BULLET_OPTIMIZE_PROMPT = """\
You are an elite resume writer.

Rewrite the user sentence into ONE concise, high-impact achievement bullet for the specified target role.

Rules:
- Output plain text only (no markdown, no quotes).
- Start with a strong action verb such as Architected, Developed, Optimized, Led, Built, or Delivered.
- Follow the Google XYZ formula: Accomplished [X] as measured by [Y], by doing [Z].
- Keep the target role in mind and make the language ATS-friendly.
- Include measurable impact when possible (%, $, time, scale).
- Keep it to one sentence.
- Keep it ATS-friendly and factual (do not invent company names).
"""


def _choose_action_verb(target_role: str) -> str:
    role = (target_role or "").strip().lower()
    if any(keyword in role for keyword in ("architect", "architecture")):
        return "Architected"
    if any(keyword in role for keyword in ("optimiz", "performance", "tuning", "speed")):
        return "Optimized"
    if any(keyword in role for keyword in ("lead", "manager", "head", "director")):
        return "Led"
    if any(keyword in role for keyword in ("develop", "engineer", "software", "backend", "frontend", "full stack", "fullstack")):
        return "Developed"
    if any(keyword in role for keyword in ("build", "builder", "creator")):
        return "Built"
    return "Delivered"


def _parse_json_response(raw_text: str) -> dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return json.loads(text)


def _local_fallback(resume_text: str, job_description: str) -> dict[str, Any]:
    token_pattern = r"[A-Za-z][A-Za-z0-9+#\-.]{2,}"

    jd_tokens = {
        token.lower()
        for token in re.findall(token_pattern, job_description)
    }
    resume_tokens = {
        token.lower()
        for token in re.findall(token_pattern, resume_text)
    }

    found_keywords = _filter_keywords(sorted(jd_tokens.intersection(resume_tokens)))
    missing_keywords = _filter_keywords(sorted(jd_tokens - resume_tokens))

    score = 0
    if jd_tokens:
        score = int(round((len(found_keywords) / len(jd_tokens)) * 100))

    if missing_keywords:
        analysis_summary = (
            f"Add the most relevant missing skills: {', '.join(missing_keywords[:6])}. "
            "Strengthen impact statements with measurable outcomes."
        )
    else:
        analysis_summary = (
            "The resume is aligned with the job description. Add stronger metrics and role-specific examples to improve the match further."
        )

    return {
        "score": max(0, min(100, score)),
        "missing_keywords": missing_keywords[:30],
        "analysis_summary": analysis_summary,
        "found_keywords": found_keywords[:30],
    }


def _invoke_gemini_ats(
    client: genai.Client,
    prompt: str,
    model_name: str,
    fallback_model: str,
) -> dict[str, Any]:
    def _invoke(model_to_use: str):
        return client.models.generate_content(
            model=model_to_use,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=_ATS_PROMPT,
                temperature=0.2,
                max_output_tokens=512,
            ),
        )

    try:
        response = _invoke(model_name)
    except Exception as exc:
        message = str(exc)
        if model_name != fallback_model and ("NOT_FOUND" in message or "not found" in message):
            response = _invoke(fallback_model)
        else:
            raise

    raw_text = response.text or ""
    payload = _parse_json_response(raw_text)

    score = max(0, min(100, int(payload.get("score", 0))))
    missing_keywords = _filter_keywords(payload.get("missing_keywords", []))[:30]
    found_keywords = _filter_keywords(payload.get("found_keywords", []))[:30]
    analysis_summary = str(payload.get("analysis_summary") or payload.get("analysis") or "").strip()

    if not analysis_summary:
        if missing_keywords:
            analysis_summary = f"Focus on the top missing skills: {', '.join(missing_keywords[:6])}."
        else:
            analysis_summary = "The resume aligns well with the role. Add measurable impact to strengthen the match."

    return {
        "score": score,
        "missing_keywords": missing_keywords,
        "analysis_summary": analysis_summary,
        "found_keywords": found_keywords,
    }


def _merge_keywords(primary: list[str], secondary: list[str], max_items: int = 30) -> list[str]:
    freq: dict[str, int] = {}
    first_seen: dict[str, int] = {}
    merged_sequence = (primary or []) + (secondary or [])

    for idx, keyword in enumerate(merged_sequence):
        kw = (keyword or "").strip()
        if not kw:
            continue
        key = kw.lower()
        freq[key] = freq.get(key, 0) + 1
        if key not in first_seen:
            first_seen[key] = idx

    ordered = sorted(freq.keys(), key=lambda key: (-freq[key], first_seen[key]))
    restored = []
    for key in ordered:
        # Recover original casing from primary first, then secondary.
        original = next((k for k in (primary or []) if k.lower() == key), None)
        if original is None:
            original = next((k for k in (secondary or []) if k.lower() == key), key)
        restored.append(original)

    return restored[:max_items]


def generate_ats_analysis(resume, job_description: str, engine_mode: str = "auto") -> dict[str, Any]:
    """Generate ATS analysis with selectable engine mode: auto, local, or api."""
    resume_text = _resume_to_text(resume)
    if len(resume_text.strip()) < 30:
        raise AppError(*RESUME_EMPTY, "Resume has too little content for analysis.")

    if not job_description or len(job_description.strip()) < 20:
        raise AppError(*JD_TOO_SHORT, "Job description is too short for meaningful analysis.")

    from app.services.local_ml_service import generate_local_ml_analysis
    local_result = generate_local_ml_analysis(resume_text, job_description)
    selected_mode = (engine_mode or "auto").strip().lower()
    if selected_mode not in {"auto", "local", "api"}:
        selected_mode = "auto"

    local_engine: dict[str, Any] = {
        "status": "ok",
        "source": "local",
        **local_result,
    }

    api_key = os.getenv("GEMINI_API_KEY")
    api_engine: dict[str, Any] = {
        "status": "unavailable",
        "source": "gemini",
        "score": 0,
        "missing_keywords": [],
        "analysis_summary": "Gemini API key not configured. Using local ATS analysis.",
        "found_keywords": [],
        "error": "GEMINI_API_KEY not set",
    }

    api_result: dict[str, Any] | None = None

    prompt = (
        f"=== RESUME DATA ===\n{resume_text}\n\n"
        f"=== JOB DESCRIPTION ===\n{job_description.strip()}\n\n"
        "Analyze the resume against the job description and return the JSON object only."
    )

    model_name = current_app.config.get("LLM_MODEL", "gemini-1.5-flash")
    fallback_model = current_app.config.get("LLM_FALLBACK_MODEL", "gemini-1.5-pro")

    should_try_api = selected_mode in {"auto", "api"}

    if api_key and should_try_api:
        try:
            client = genai.Client(api_key=api_key)
            api_result = _invoke_gemini_ats(client, prompt, model_name, fallback_model)
            api_engine = {
                "status": "ok",
                "source": "gemini",
                **api_result,
            }
        except (json.JSONDecodeError, ValueError) as exc:
            logger.exception("ATS JSON parse failed: %s", exc)
            api_engine = {
                "status": "error",
                "source": "gemini",
                "score": 0,
                "missing_keywords": [],
                "found_keywords": [],
                "analysis_summary": "Gemini returned an unparseable response. Using local ATS analysis.",
                "error": "UNPARSEABLE_RESPONSE",
            }
        except Exception as exc:
            logger.exception("Gemini ATS call failed: %s", exc)
            api_engine = {
                "status": "error",
                "source": "gemini",
                "score": 0,
                "missing_keywords": [],
                "found_keywords": [],
                "analysis_summary": "Gemini call failed. Using local ATS analysis.",
                "error": str(exc),
            }
    else:
        if selected_mode == "api" and not api_key:
            raise AppError(*LLM_UNAVAILABLE, "API mode selected, but GEMINI_API_KEY is not configured.")
        logger.warning("GEMINI_API_KEY is not set or API mode not requested; local ATS analysis only.")

    if selected_mode == "api" and api_engine.get("status") != "ok":
        raise AppError(*LLM_UNAVAILABLE, "API mode selected, but API analysis is unavailable right now.")

    api_found = api_engine.get("found_keywords", []) if api_engine.get("status") == "ok" else []
    api_missing = api_engine.get("missing_keywords", []) if api_engine.get("status") == "ok" else []
    local_found = local_result.get("found_keywords", [])
    local_missing = local_result.get("missing_keywords", [])

    # Union the found words
    merged_found = _merge_keywords(api_found, local_found, max_items=40)
    
    # Union the missing words
    all_missing = _merge_keywords(api_missing, local_missing, max_items=60)
    
    # Filter out missing ones that were actually found by either model
    merged_found_set = {f.lower() for f in merged_found}
    merged_missing = [kw for kw in all_missing if kw.lower() not in merged_found_set][:30]
    merged_found = merged_found[:30]

    api_score = api_engine.get("score") if api_engine.get("status") == "ok" else None
    local_score = local_result.get("score", 0)

    # Compute a blended score
    if api_score is not None:
        final_score = int(round((api_score + local_score) / 2))
    else:
        final_score = local_score

    # Use Gemini's human-like summary if available
    analysis_summary = "Combined comparative analysis from Gemini API and local all-MiniLM-L6-v2."
    if api_result and api_engine.get("status") == "ok":
        analysis_summary = api_result.get("analysis_summary", analysis_summary)

    return {
        "score": final_score,
        "missing_keywords": merged_missing,
        "analysis_summary": analysis_summary,
        "found_keywords": merged_found,
        "best_engine": "hybrid",
        "selected_engine_mode": selected_mode,
        "best_keywords": {
            "found": merged_found,
            "missing": merged_missing,
        },
        "engine_breakdown": {
            "local": local_engine,
            "api": api_engine,
        },
    }


def optimize_bullet(current_text: str, target_role: str) -> dict[str, str]:
    """Rewrite a raw sentence into a STAR-style ATS-friendly achievement bullet."""
    text = (current_text or "").strip()
    if len(text) < 8:
        raise AppError(*JD_TOO_SHORT, "Input sentence is too short to optimize.")

    role_context = (target_role or "target role").strip() or "target role"

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        cleaned = text.rstrip(".")
        action_verb = _choose_action_verb(role_context)
        return {
            "optimized_bullet": (
                f"{action_verb} measurable improvements for a {role_context} role as measured by stronger results and clearer impact, by refining: {cleaned}."
            ),
            "source": "fallback",
        }

    model_name = current_app.config.get("LLM_MODEL", "gemini-1.5-flash")
    fallback_model = current_app.config.get("LLM_FALLBACK_MODEL", "gemini-1.5-pro")

    prompt = (
        f"Target role: {role_context}\n"
        f"Current text: {text}\n\n"
        "Rewrite the current text into one achievement bullet that follows the Google XYZ formula."
    )

    try:
        client = genai.Client(api_key=api_key)

        def _invoke(model_to_use: str):
            return client.models.generate_content(
                model=model_to_use,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=_BULLET_OPTIMIZE_PROMPT,
                    temperature=0.35,
                    max_output_tokens=120,
                ),
            )

        try:
            response = _invoke(model_name)
        except Exception as exc:
            message = str(exc)
            if model_name != fallback_model and ("NOT_FOUND" in message or "not found" in message):
                response = _invoke(fallback_model)
            else:
                raise

        optimized = (response.text or "").strip()
    except Exception as exc:
        logger.exception("Gemini bullet optimization failed: %s", exc)
        cleaned = text.rstrip(".")
        action_verb = _choose_action_verb(role_context)
        optimized = (
            f"{action_verb} measurable improvements for a {role_context} role as measured by stronger results and clearer impact, by refining: {cleaned}."
        )
        return {"optimized_bullet": optimized, "source": "fallback"}

    if not optimized:
        raise AppError(*LLM_UNAVAILABLE, "AI did not return an optimized bullet. Try again.")

    return {"optimized_bullet": optimized, "source": "gemini"}
