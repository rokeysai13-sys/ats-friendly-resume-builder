from flask import Blueprint, abort, request, jsonify
from marshmallow import ValidationError
from typing import Any
import logging
from flask_login import login_required, current_user

from app.common.errors import AppError, VALIDATION_ERROR
from .services import (
    get_resume_or_404,
    list_user_resumes,
    create_resume,
    delete_resume,
    update_resume_section,
    update_personal_info,
    get_resume_versions,
    get_version_by_no_or_404,
    revert_to_version,
    create_public_link,
    get_public_resume,
    revoke_public_link,
    update_resume_metadata,
    snapshot_resume
)
from .models import Resume
from .schemas import (
    EducationSchema,
    ExperienceSchema,
    SkillSchema,
    ProjectSchema,
    CertificateSchema,
    PersonalInfoSchema,
    ResumeCreateSchema,
    ResumeUpdateSchema,
    ResumeResponseSchema
)

logger = logging.getLogger(__name__)
resume_bp = Blueprint("resume", __name__)

# --- 4.2 Resume CRUD Endpoints ---

@resume_bp.route("/resumes", methods=["GET"])
@login_required
def get_resumes() -> Any:
    """List all resumes for the current user."""
    resumes = list_user_resumes(current_user.id)
    return jsonify({
        "data": ResumeResponseSchema(many=True).dump(resumes)
    }), 200

@resume_bp.route("/resumes", methods=["POST"])
@login_required
def add_resume() -> Any:
    """Create a new resume."""
    json_data = request.get_json(silent=True) or {}
    try:
        data = ResumeCreateSchema().load(json_data)
    except ValidationError as e:
        raise AppError(*VALIDATION_ERROR, str(e.messages))
    
    resume = create_resume(current_user.id, data)
    return jsonify(ResumeResponseSchema().dump(resume)), 201

@resume_bp.route("/resumes/<int:id>", methods=["GET"])
@login_required
def get_resume(id: int) -> Any:
    """Retrieve full resume details."""
    resume = get_resume_or_404(id, current_user.id)
    return jsonify(ResumeResponseSchema().dump(resume)), 200

@resume_bp.route("/resumes/<int:id>", methods=["PUT"])
@login_required
def update_full_resume(id: int) -> Any:
    """Save full resume state and create a version snapshot."""
    json_data = request.get_json(silent=True) or {}
    try:
        data = ResumeUpdateSchema().load(json_data)
    except ValidationError as e:
        raise AppError(*VALIDATION_ERROR, str(e.messages))
    
    resume = Resume.query.get(id)
    if resume is None:
        raise AppError("RESUME_NOT_FOUND", 404, "Resume not found.")
    if resume.user_id != current_user.id:
        abort(403)

    # 1. Update metadata and personal info
    resume = update_resume_metadata(id, current_user.id, data)
    
    # 2. Update each child section if provided
    sections = ['education', 'experience', 'skills', 'projects', 'certificates']
    for sec in sections:
        if sec in data:
            update_resume_section(id, current_user.id, sec, data[sec])
            
    # 3. Create snapshot
    version = snapshot_resume(id, current_user.id)
    
    return jsonify({
        "id": resume.id,
        "updated_at": resume.updated_at.isoformat(),
        "version_no": version.version_no
    }), 200

@resume_bp.route("/resumes/<int:id>", methods=["DELETE"])
@login_required
def remove_resume(id: int) -> Any:
    """Delete a resume."""
    delete_resume(id, current_user.id)
    return "", 204


# --- 4.3 Resume Section Endpoints ---

@resume_bp.route("/resumes/<int:id>/personal-info", methods=["PUT"])
@login_required
def update_personal_info_endpoint(id: int) -> Any:
    """
    Update personal information fields (name, email, phone, location, social links).
    """
    json_data = request.get_json(silent=True) or {}
    try:
        data = PersonalInfoSchema().load(json_data)
    except ValidationError as e:
        raise AppError(*VALIDATION_ERROR, str(e.messages))
    
    # Validation: if email is provided, name must also be provided (and vice versa)
    has_email = 'email' in json_data
    has_name = 'name' in json_data
    
    if has_email and not has_name:
        raise AppError(*VALIDATION_ERROR, "name is required when updating email")
    if has_name and not has_email:
        raise AppError(*VALIDATION_ERROR, "email is required when updating name")
    
    resume = update_personal_info(id, current_user.id, data)
    
    # Return updated resume data
    return jsonify({
        "id": resume.id,
        "name": resume.personal_name,
        "email": resume.personal_email,
        "phone": resume.personal_phone,
        "location": resume.personal_location,
        "linkedinUrl": resume.personal_linkedin,
        "portfolioUrl": resume.personal_portfolio,
        "updated_at": resume.updated_at.isoformat()
    }), 200


@resume_bp.route("/resumes/<int:id>/<section>", methods=["PUT"])
@login_required
def update_section(id: int, section: str) -> Any:
    """
    Explicit sectional updates for education, experience, projects, and certificates.
    """
    valid_sections = {
        "education": EducationSchema,
        "experience": ExperienceSchema,
        "skills": SkillSchema,
        "projects": ProjectSchema,
        "certificates": CertificateSchema
    }
    
    if section not in valid_sections:
        return jsonify({"error": "Invalid section", "code": "VALIDATION_ERROR"}), 400
        
    json_data = request.get_json(silent=True)
    if json_data is None:
        raise AppError(*VALIDATION_ERROR, "Request body is mandatory.")
        
    try:
        data = valid_sections[section](many=True).load(json_data)
    except ValidationError as e:
        raise AppError(*VALIDATION_ERROR, str(e.messages))

    update_resume_section(id, current_user.id, section, data)
    return jsonify({"message": f"{section.capitalize()} updated successfully."}), 200


# --- 4.4 Versioning Endpoints ---

@resume_bp.route("/resumes/<int:id>/versions", methods=["GET"])
@login_required
def list_versions(id: int) -> Any:
    """List all version snapshots for a resume."""
    versions = get_resume_versions(id, current_user.id)
    return jsonify({
        "data": [
            {
                "id": v.id,
                "version_no": v.version_no,
                "label": v.label,
                "created_at": v.created_at.isoformat()
            } for v in versions
        ]
    }), 200

@resume_bp.route("/resumes/<int:id>/versions/<int:version_no>", methods=["GET"])
@login_required
def get_version(id: int, version_no: int) -> Any:
    """Fetch full snapshot data for preview."""
    version = get_version_by_no_or_404(id, version_no)
    return jsonify({
        "version_no": version.version_no,
        "label": version.label,
        "data": version.data,
        "created_at": version.created_at.isoformat()
    }), 200

@resume_bp.route("/resumes/<int:id>/versions/<int:version_no>/revert", methods=["POST"])
@login_required
def revert_resume(id: int, version_no: int) -> Any:
    """Revert resume to a specific version number and save as a new version."""
    resume = revert_to_version(id, current_user.id, version_no)
    # Create a new snapshot after reverting
    new_v = snapshot_resume(resume.id, current_user.id, label=f"Reverted to v{version_no}")
    
    return jsonify({
        "message": f"Reverted to version {version_no}.",
        "version_no": new_v.version_no
    }), 200


# --- 4.5 Share Link Endpoints ---

@resume_bp.route("/resumes/<int:id>/share", methods=["POST"])
@login_required
def create_share_link(id: int) -> Any:
    """Generate a public sharing link."""
    link = create_public_link(id, current_user.id)
    return jsonify({
        "token": link.token,
        "public_url": f"/api/v1/public/{link.token}",
        "created_at": link.created_at.isoformat(),
        "expires_at": link.expires_at.isoformat() if link.expires_at else None
    }), 201

@resume_bp.route("/resumes/<int:id>/share", methods=["DELETE"])
@login_required
def revoke_link(id: int) -> Any:
    """Revoke the public sharing link."""
    revoke_public_link(id, current_user.id)
    return "", 204

@resume_bp.route("/public/<token>", methods=["GET"])
def get_shared_resume(token: str) -> Any:
    """Resolve share token and return resume data (Public)."""
    resume = get_public_resume(token)
    return jsonify({
        "resume": ResumeResponseSchema().dump(resume)
    }), 200


@resume_bp.route("/resumes/<int:id>/summary-generate", methods=["POST"])
@login_required
def generate_summary(id: int) -> Any:
    """
    Generate a professional summary from the current resume content.

    Optional JSON body: { "job_description": "..." }
    Returns: { "summary": "..." }
    """
    from .ats_service import generate_professional_summary

    json_data = request.get_json(silent=True) or {}
    job_description = (json_data.get("job_description") or "").strip()

    resume = get_resume_or_404(id, current_user.id)
    summary = generate_professional_summary(resume, job_description=job_description)

    return jsonify({"summary": summary}), 200

# --- 4.6 NLP Endpoints ---

@resume_bp.route("/auto-parse", methods=["POST"])
@login_required
def auto_parse_resume() -> Any:
    """Parse raw text to extract resume fields via SpaCy."""
    json_data = request.get_json(silent=True) or {}
    text = json_data.get("text", "")
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    from app.services.nlp_parser_service import parse_cv_text
    parsed_data = parse_cv_text(text)
    
    return jsonify({"data": parsed_data}), 200

@resume_bp.route("/role-match", methods=["POST"])
@login_required
def get_role_match() -> Any:
    """Classify resume text against target roles via Zero-Shot BART."""
    json_data = request.get_json(silent=True) or {}
    text = json_data.get("text", "")
    roles = json_data.get("roles", ["Software Engineer", "Data Scientist", "Product Manager", "UI/UX Designer"])
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    from app.services.nlp_parser_service import match_role
    matches = match_role(text, roles)
    
    return jsonify({"data": matches}), 200
