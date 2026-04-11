from datetime import datetime, UTC
from app.extensions import db

class Template(db.Model):
    __tablename__ = 'templates'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    html_path = db.Column(db.String(255), nullable=False)
    css_path = db.Column(db.String(255), nullable=False)
    thumbnail = db.Column(db.String(255))
    ats_safe = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))

    # Relationships
    resumes = db.relationship('Resume', back_populates='template')

class Resume(db.Model):
    __tablename__ = 'resumes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id', ondelete='SET NULL'), nullable=True)
    title = db.Column(db.String(255), nullable=False, default='Untitled Resume')
    
    # Personal Info
    personal_name = db.Column(db.String(255))
    personal_email = db.Column(db.String(255))
    personal_phone = db.Column(db.String(50))
    personal_location = db.Column(db.String(255))
    personal_linkedin = db.Column(db.String(255))
    personal_portfolio = db.Column(db.String(255))
    
    summary = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Relationships
    user = db.relationship('User', back_populates='resumes')
    template = db.relationship('Template', back_populates='resumes')
    
    education = db.relationship('Education', back_populates='resume', cascade='all, delete-orphan', order_by='Education.position')
    experience = db.relationship('Experience', back_populates='resume', cascade='all, delete-orphan', order_by='Experience.position')
    skills = db.relationship('Skill', back_populates='resume', cascade='all, delete-orphan', order_by='Skill.position')
    projects = db.relationship('Project', back_populates='resume', cascade='all, delete-orphan', order_by='Project.position')
    certificates = db.relationship('Certificate', back_populates='resume', cascade='all, delete-orphan', order_by='Certificate.position')
    versions = db.relationship('Version', back_populates='resume', cascade='all, delete-orphan')
    public_links = db.relationship('PublicLink', back_populates='resume', cascade='all, delete-orphan')

class Education(db.Model):
    __tablename__ = 'education'
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    school = db.Column(db.String(255), nullable=False)
    degree = db.Column(db.String(255), nullable=False)
    field = db.Column(db.String(255))
    start_year = db.Column(db.String(20))
    end_year = db.Column(db.String(20))
    position = db.Column(db.Integer, default=0)

    resume = db.relationship('Resume', back_populates='education')

class Experience(db.Model):
    __tablename__ = 'experience'
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    company = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(255), nullable=False)
    start_date = db.Column(db.String(50))
    end_date = db.Column(db.String(50))
    description = db.Column(db.Text)
    position = db.Column(db.Integer, default=0)

    resume = db.relationship('Resume', back_populates='experience')

class Skill(db.Model):
    __tablename__ = 'skills'
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    skill_name = db.Column(db.String(100), nullable=False)
    level = db.Column(db.String(50))
    position = db.Column(db.Integer, default=0)

    __table_args__ = (
        db.UniqueConstraint('resume_id', 'skill_name', name='uq_resume_skill'),
    )

    resume = db.relationship('Resume', back_populates='skills')

class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    tech_stack = db.Column(db.Text)
    github_link = db.Column(db.String(255))
    demo_link = db.Column(db.String(255))
    created_date = db.Column(db.String(50))
    url = db.Column(db.String(255))
    position = db.Column(db.Integer, default=0)

    resume = db.relationship('Resume', back_populates='projects')

class Certificate(db.Model):
    __tablename__ = 'certificates'
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    issuer = db.Column(db.String(255))
    year = db.Column(db.String(20))
    position = db.Column(db.Integer, default=0)

    resume = db.relationship('Resume', back_populates='certificates')

class Version(db.Model):
    __tablename__ = 'versions'
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    version_no = db.Column(db.Integer, nullable=False)
    label = db.Column(db.String(100))
    data = db.Column(db.JSON)  # Using db.JSON for cross-compatibility with SQLite testing/Postgres
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))

    __table_args__ = (
        db.UniqueConstraint('resume_id', 'version_no', name='uq_resume_version'),
    )

    resume = db.relationship('Resume', back_populates='versions')

class PublicLink(db.Model):
    __tablename__ = 'public_links'
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    expires_at = db.Column(db.DateTime)

    resume = db.relationship('Resume', back_populates='public_links')
