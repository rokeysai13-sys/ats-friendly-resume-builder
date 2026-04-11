"""API routes for ATS analysis and other authenticated JSON endpoints."""
from __future__ import annotations

import json
from datetime import date
from typing import Any

from flask import Blueprint, abort, jsonify, request
from flask_login import current_user, login_required

from app.common.errors import AppError, VALIDATION_ERROR
from app.extensions import db, limiter
from app.models import Certification
from app.resume.models import Project, Resume
from app.resume.services import get_resume_or_404
from app.services.ai_service import generate_ats_analysis, optimize_bullet

api_bp = Blueprint("api", __name__)


def _ats_analyze_rate_limit_breach(_limit):
    return jsonify({
        "error": "RATE_LIMIT_EXCEEDED",
        "message": "AI is cooling down. Please wait 60 seconds.",
    }), 429


def _load_json_payload() -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if isinstance(payload, dict):
        return payload

    raw_body = request.get_data(as_text=True).strip()
    if not raw_body:
        return {}

    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError:
        return {}

    return parsed if isinstance(parsed, dict) else {}


def _parse_optional_date(value: Any, field_name: str) -> date | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise AppError(*VALIDATION_ERROR, f"{field_name} must be an ISO date string (YYYY-MM-DD).")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise AppError(*VALIDATION_ERROR, f"{field_name} must be in YYYY-MM-DD format.") from exc


def _serialize_certification(cert: Certification) -> dict[str, Any]:
    return {
        "id": cert.id,
        "name": cert.name,
        "issuing_organization": cert.issuing_organization,
        "issue_date": cert.issue_date.isoformat() if cert.issue_date else None,
        "expiration_date": cert.expiration_date.isoformat() if cert.expiration_date else None,
        "credential_url": cert.credential_url,
    }


def _serialize_project(project: Project) -> dict[str, Any]:
    return {
        "id": project.id,
        "resume_id": project.resume_id,
        "title": project.title,
        "description": project.description,
        "tech_stack": project.tech_stack,
        "github_link": project.github_link,
        "demo_link": project.demo_link,
        "created_date": project.created_date,
        "url": project.url,
    }


def _parse_resume_id(value: Any) -> int:
    if value in (None, ""):
        raise AppError(*VALIDATION_ERROR, "resume_id is required.")
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise AppError(*VALIDATION_ERROR, "resume_id must be an integer.") from exc


@api_bp.route("/resumes/<int:id>/ats-analyze", methods=["POST"])
@login_required
@limiter.limit("5 per minute", on_breach=_ats_analyze_rate_limit_breach)
def ats_analyze(id: int) -> Any:
    """Analyze a resume against a job description using Gemini.
    Rate limited to 5 requests per minute due to high Gemini API costs.
    """
    payload = _load_json_payload()
    job_description = (payload.get("job_description") or "").strip()
    engine_mode = str(payload.get("engine_mode") or "auto").strip().lower()
    if engine_mode not in {"auto", "local", "api"}:
        engine_mode = "auto"

    if not job_description:
        raise AppError(*VALIDATION_ERROR, "job_description is required in the request body.")

    resume = Resume.query.get(id)
    if resume is None:
        raise AppError("RESUME_NOT_FOUND", 404, "Resume not found.")
    if resume.user_id != current_user.id:
        abort(403)

    result = generate_ats_analysis(resume, job_description, engine_mode=engine_mode)

    return jsonify({
        "score": result["score"],
        "missing_keywords": result["missing_keywords"],
        "analysis_summary": result["analysis_summary"],
        "suggestions": [result["analysis_summary"]],
        "found_keywords": result.get("found_keywords", []),
        "best_keywords": result.get("best_keywords", {
            "found": result.get("found_keywords", []),
            "missing": result.get("missing_keywords", []),
        }),
        "best_engine": result.get("best_engine", "local"),
        "selected_engine_mode": result.get("selected_engine_mode", engine_mode),
        "engine_breakdown": result.get("engine_breakdown", {}),
    }), 200


@api_bp.route("/ai/optimize-bullet", methods=["POST"])
@login_required
@limiter.limit("5 per minute")
def ai_optimize_bullet() -> Any:
    """Rewrite a resume bullet into a high-impact XYZ-style bullet.
    Rate limited to 5 requests per minute due to Gemini API costs.
    """
    payload = _load_json_payload()
    current_text = (payload.get("current_text") or payload.get("raw_sentence") or "").strip()
    target_role = (payload.get("target_role") or payload.get("job_description") or "").strip()

    if not current_text:
        raise AppError(*VALIDATION_ERROR, "current_text is required in the request body.")

    result = optimize_bullet(current_text, target_role)
    return jsonify(result), 200


@api_bp.route("/certifications", methods=["GET"])
@login_required
def list_certifications() -> Any:
    certs = (
        Certification.query
        .filter_by(user_id=current_user.id)
        .order_by(Certification.issue_date.desc().nullslast(), Certification.id.desc())
        .all()
    )
    return jsonify({"data": [_serialize_certification(cert) for cert in certs]}), 200


@api_bp.route("/certifications", methods=["POST"])
@login_required
def create_certification() -> Any:
    payload = _load_json_payload()
    name = (payload.get("name") or "").strip()

    if not name:
        raise AppError(*VALIDATION_ERROR, "name is required.")

    cert = Certification(
        user_id=current_user.id,
        name=name,
        issuing_organization=(payload.get("issuing_organization") or "").strip() or None,
        issue_date=_parse_optional_date(payload.get("issue_date"), "issue_date"),
        expiration_date=_parse_optional_date(payload.get("expiration_date"), "expiration_date"),
        credential_url=(payload.get("credential_url") or "").strip() or None,
    )

    db.session.add(cert)
    db.session.commit()

    return jsonify({"data": _serialize_certification(cert)}), 201


@api_bp.route("/certifications/<int:certification_id>", methods=["DELETE"])
@login_required
def delete_certification(certification_id: int) -> Any:
    cert = Certification.query.filter_by(id=certification_id, user_id=current_user.id).first()
    if cert is None:
        raise AppError("CERTIFICATION_NOT_FOUND", 404, "Certification not found.")

    db.session.delete(cert)
    db.session.commit()

    return "", 204


@api_bp.route("/projects", methods=["GET"])
@login_required
def list_projects() -> Any:
    resume_id = _parse_resume_id(request.args.get("resume_id"))
    get_resume_or_404(resume_id, current_user.id)

    projects = (
        Project.query
        .filter_by(resume_id=resume_id)
        .order_by(Project.position.asc(), Project.id.asc())
        .all()
    )
    return jsonify({"data": [_serialize_project(project) for project in projects]}), 200


@api_bp.route("/projects", methods=["POST"])
@login_required
def create_project() -> Any:
    payload = _load_json_payload()
    resume_id = _parse_resume_id(payload.get("resume_id"))
    get_resume_or_404(resume_id, current_user.id)

    title = (payload.get("title") or "").strip()
    if not title:
        raise AppError(*VALIDATION_ERROR, "title is required.")

    project = Project(
        resume_id=resume_id,
        title=title,
        description=(payload.get("description") or "").strip() or None,
        tech_stack=(payload.get("tech_stack") or "").strip() or None,
        github_link=(payload.get("github_link") or "").strip() or None,
        demo_link=(payload.get("demo_link") or "").strip() or None,
        created_date=(payload.get("created_date") or "").strip() or None,
        url=(payload.get("url") or "").strip() or None,
        position=int(payload.get("position") or 0),
    )

    db.session.add(project)
    db.session.commit()

    return jsonify({"data": _serialize_project(project)}), 201


@api_bp.route("/projects/<int:project_id>", methods=["PUT"])
@login_required
def update_project(project_id: int) -> Any:
    payload = _load_json_payload()
    project = (
        Project.query
        .join(Resume, Project.resume_id == Resume.id)
        .filter(Project.id == project_id)
        .filter(Resume.user_id == current_user.id)
        .first()
    )
    if project is None:
        raise AppError("PROJECT_NOT_FOUND", 404, "Project not found.")

    if "title" in payload:
        title = (payload.get("title") or "").strip()
        if not title:
            raise AppError(*VALIDATION_ERROR, "title cannot be empty.")
        project.title = title
    if "description" in payload:
        project.description = (payload.get("description") or "").strip() or None
    if "tech_stack" in payload:
        project.tech_stack = (payload.get("tech_stack") or "").strip() or None
    if "github_link" in payload:
        project.github_link = (payload.get("github_link") or "").strip() or None
    if "demo_link" in payload:
        project.demo_link = (payload.get("demo_link") or "").strip() or None
    if "created_date" in payload:
        project.created_date = (payload.get("created_date") or "").strip() or None
    if "url" in payload:
        project.url = (payload.get("url") or "").strip() or None
    if "position" in payload:
        try:
            project.position = int(payload.get("position") or 0)
        except (TypeError, ValueError) as exc:
            raise AppError(*VALIDATION_ERROR, "position must be an integer.") from exc

    db.session.commit()
    return jsonify({"data": _serialize_project(project)}), 200


@api_bp.route("/projects/<int:project_id>", methods=["DELETE"])
@login_required
def delete_project(project_id: int) -> Any:
    project = (
        Project.query
        .join(Resume, Project.resume_id == Resume.id)
        .filter(Project.id == project_id)
        .filter(Resume.user_id == current_user.id)
        .first()
    )
    if project is None:
        raise AppError("PROJECT_NOT_FOUND", 404, "Project not found.")

    db.session.delete(project)
    db.session.commit()

    return "", 204
