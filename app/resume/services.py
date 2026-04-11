import uuid
from datetime import datetime, UTC, timedelta
from flask import current_app

from app.extensions import db
from app.common.errors import AppError, RESUME_NOT_FOUND, VERSION_NOT_FOUND, LINK_EXPIRED, LINK_NOT_FOUND
from .models import Resume, Education, Experience, Skill, Project, Certificate, Version, PublicLink

def get_resume_or_404(resume_id, user_id):
    """Retrieves a resume or raises 404 AppError."""
    resume = Resume.query.filter_by(id=resume_id, user_id=user_id).first()
    if not resume:
        raise AppError(*RESUME_NOT_FOUND)
    return resume

def create_resume(user_id, data):
    """Creates a new resume and triggers initial Version 0 snapshot."""
    new_resume = Resume(
        user_id=user_id,
        title=data.get('title'),
        template_id=data.get('template_id', 1)
    )
    db.session.add(new_resume)
    db.session.flush()  # Get the ID
    
    # Create initial version snapshot
    snapshot_resume(new_resume.id, user_id, label="Initial Version")
    
    db.session.commit()
    return new_resume

def snapshot_resume(resume_id, user_id, label=None):
    """Serializes the entire resume state to JSONB in the Version table."""
    resume = get_resume_or_404(resume_id, user_id)
    
    # Serialize structure
    snapshot_data = {
        "title": resume.title,
        "template_id": resume.template_id,
        "personal_name": resume.personal_name,
        "personal_email": resume.personal_email,
        "personal_phone": resume.personal_phone,
        "personal_location": resume.personal_location,
        "personal_linkedin": resume.personal_linkedin,
        "personal_portfolio": resume.personal_portfolio,
        "summary": resume.summary,
        "education": [
            {
                "school": e.school, "degree": e.degree, "field": e.field,
                "start_year": e.start_year, "end_year": e.end_year, "position": e.position
            } for e in resume.education
        ],
        "experience": [
            {
                "company": e.company, "role": e.role, "start_date": e.start_date,
                "end_date": e.end_date, "description": e.description, "position": e.position
            } for e in resume.experience
        ],
        "skills": [
            {
                "skill_name": s.skill_name, "level": s.level, "position": s.position
            } for s in resume.skills
        ],
        "projects": [
            {
                "title": p.title,
                "description": p.description,
                "tech_stack": p.tech_stack,
                "github_link": p.github_link,
                "demo_link": p.demo_link,
                "created_date": p.created_date,
                "url": p.url,
                "position": p.position,
            } for p in resume.projects
        ],
        "certificates": [
            {
                "name": c.name, "issuer": c.issuer, "year": c.year, "position": c.position
            } for c in resume.certificates
        ]
    }

    # Determine next version number
    last_version = Version.query.filter_by(resume_id=resume_id).order_by(Version.version_no.desc()).first()
    next_no = (last_version.version_no + 1) if last_version else 0

    new_version = Version(
        resume_id=resume_id,
        version_no=next_no,
        label=label or f"Snapshot {datetime.now(UTC).strftime('%Y-%m-%d %H:%M')}",
        data=snapshot_data
    )
    db.session.add(new_version)
    db.session.commit()
    return new_version

def get_version_by_no_or_404(resume_id, version_no):
    """Retrieves a specific version by its version number."""
    version = Version.query.filter_by(resume_id=resume_id, version_no=version_no).first()
    if not version:
        raise AppError(*VERSION_NOT_FOUND)
    return version

def revert_to_version(resume_id, user_id, version_no):
    """Restores resume state from a saved snapshot using the version number."""
    resume = get_resume_or_404(resume_id, user_id)
    version = get_version_by_no_or_404(resume.id, version_no)
    
    if not version:
        raise AppError(*VERSION_NOT_FOUND)
    
    data = version.data
    
    # 1. Update main fields
    resume.title = data.get('title')
    resume.template_id = data.get('template_id')
    resume.personal_name = data.get('personal_name')
    resume.personal_email = data.get('personal_email')
    resume.personal_phone = data.get('personal_phone')
    resume.personal_location = data.get('personal_location')
    resume.personal_linkedin = data.get('personal_linkedin')
    resume.personal_portfolio = data.get('personal_portfolio')
    resume.summary = data.get('summary')

    # 2. Re-populate child collections
    # Clear existing
    Education.query.filter_by(resume_id=resume_id).delete()
    Experience.query.filter_by(resume_id=resume_id).delete()
    Skill.query.filter_by(resume_id=resume_id).delete()
    Project.query.filter_by(resume_id=resume_id).delete()
    Certificate.query.filter_by(resume_id=resume_id).delete()

    # Re-insert
    for item in data.get('education', []):
        db.session.add(Education(resume_id=resume_id, **item))
    for item in data.get('experience', []):
        db.session.add(Experience(resume_id=resume_id, **item))
    for item in data.get('skills', []):
        db.session.add(Skill(resume_id=resume_id, **item))
    for item in data.get('projects', []):
        db.session.add(Project(resume_id=resume_id, **item))
    for item in data.get('certificates', []):
        db.session.add(Certificate(resume_id=resume_id, **item))

    db.session.commit()
    return resume

def create_public_link(resume_id, user_id, expires_in_days=30):
    """Generates a public sharing token for the resume."""
    resume = get_resume_or_404(resume_id, user_id)
    
    # Optional: Deactivate old links if you want only one active at a time
    # PublicLink.query.filter_by(resume_id=resume_id).delete()

    token = str(uuid.uuid4())
    expiry = datetime.now(UTC) + timedelta(days=expires_in_days)
    
    link = PublicLink(
        resume_id=resume.id,
        token=token,
        expires_at=expiry
    )
    db.session.add(link)
    db.session.commit()
    return link

def get_public_resume(token):
    """Retrieves a resume via public token, checking for expiration."""
    link = PublicLink.query.filter_by(token=token).first()
    
    if not link:
        raise AppError(*RESUME_NOT_FOUND, "Invalid public link.")
        
    if link.expires_at and link.expires_at < datetime.now(UTC):
        raise AppError(*LINK_EXPIRED)
        
    return link.resume

def list_user_resumes(user_id):
    """Returns all resumes owned by the specified user."""
    return Resume.query.filter_by(user_id=user_id).order_by(Resume.updated_at.desc()).all()

def delete_resume(resume_id, user_id):
    """Deletes a resume and associated cascading data if the user owns it."""
    resume = get_resume_or_404(resume_id, user_id)
    db.session.delete(resume)
    db.session.commit()
    return True

def revoke_public_link(resume_id, user_id):
    """Deletes the public share link if it exists."""
    resume = get_resume_or_404(resume_id, user_id)
    PublicLink.query.filter_by(resume_id=resume.id).delete()
    db.session.commit()
    return True

def update_resume_metadata(resume_id, user_id, data):
    """Updates high-level resume attributes (title, template)."""
    resume = get_resume_or_404(resume_id, user_id)
    if 'title' in data:
        resume.title = data['title']
    if 'template_id' in data:
        resume.template_id = data['template_id']
    
    # Update personal info/summary if present in the data dict
    fields = [
        'personal_name', 'personal_email', 'personal_phone',
        'personal_location', 'personal_linkedin', 'personal_portfolio', 'summary'
    ]
    for field in fields:
        if field in data:
            setattr(resume, field, data[field])

    resume.updated_at = datetime.now(UTC)
    db.session.commit()
    return resume

def get_resume_versions(resume_id, user_id):
    """Retrieves the version history for a specific resume."""
    resume = get_resume_or_404(resume_id, user_id)
    return Version.query.filter_by(resume_id=resume.id).order_by(Version.version_no.desc()).all()

def update_personal_info(resume_id, user_id, data):
    """
    Updates only personal info fields (name, email, phone, location, social links).
    """
    resume = get_resume_or_404(resume_id, user_id)
    
    # Map incoming field names to resume model fields
    field_mapping = {
        'name': 'personal_name',
        'email': 'personal_email',
        'phone': 'personal_phone',
        'location': 'personal_location',
        'linkedinUrl': 'personal_linkedin',
        'portfolioUrl': 'personal_portfolio'
    }
    
    for incoming_key, model_key in field_mapping.items():
        if incoming_key in data:
            setattr(resume, model_key, data[incoming_key])
    
    # githubUrl is accepted but not stored (yet) - can be added in future migration
    # if 'githubUrl' in data:
    #     setattr(resume, 'personal_github', data['githubUrl'])
    
    resume.updated_at = datetime.now(UTC)
    db.session.commit()
    return resume

def update_resume_section(resume_id, user_id, section, data):
    """
    Generic section updater for resume sections (UI calls this via PUT /api/v1/resumes/:id/:section)
    """
    resume = get_resume_or_404(resume_id, user_id)
    
    # Map section string to Model and delete old records
    section_map = {
        'education': Education,
        'experience': Experience,
        'skills': Skill,
        'projects': Project,
        'certificates': Certificate
    }
    
    if section in section_map:
        model = section_map[section]
        model.query.filter_by(resume_id=resume.id).delete()
        
        for item in data:
            # For skills, fix name/category mapping if data uses name/category
            if section == 'skills':
                new_item = Skill(
                    resume_id=resume.id,
                    skill_name=item.get('name') or item.get('skill_name'),
                    level=item.get('category') or item.get('level'),
                    position=item.get('position', 0)
                )
                db.session.add(new_item)
            else:
                db.session.add(model(resume_id=resume.id, **item))
    
    resume.updated_at = datetime.now(UTC)
    db.session.commit()
    return resume
