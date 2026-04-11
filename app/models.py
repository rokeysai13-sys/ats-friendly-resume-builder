"""
Compatibility models module.

Keeps a stable import path (`app.models`) while model implementations
remain in feature modules.
"""

from app.auth.models import User, Certification
from app.resume.models import (
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
    "User",
    "Certification",
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
