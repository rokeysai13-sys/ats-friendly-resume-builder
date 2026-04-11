# Register models for alembic auto-detection and Flask logic
from .models import (
    Template,
    Resume,
    Education,
    Experience,
    Skill,
    Project,
    Certificate,
    Version,
    PublicLink,
)

__all__ = [
    "Template",
    "Resume",
    "Education",
    "Experience",
    "Skill",
    "Project",
    "Certificate",
    "Version",
    "PublicLink",
]