"""
app/auth/models.py
SQLAlchemy models for: users, refresh_tokens, security_audit_log
DDL source: BACKEND_STRUCTURE.md §3.2
"""
from datetime import datetime, timezone
from flask_login import UserMixin

from app.extensions import db


# ─── Users ────────────────────────────────────────────────────────────────────

class User(UserMixin, db.Model):
    __tablename__ = "users"
    __table_args__ = (
        # Partial unique index: only enforce uniqueness when google_id is NOT NULL.
        # SQLAlchemy renders this as a UniqueConstraint; the partial behaviour is
        # enforced at the DB level via a migration-injected DDL event for PostgreSQL.
        # For SQLite (local dev) a plain unique index is sufficient.
        db.Index("idx_users_google", "google_id", unique=True),
    )

    id             = db.Column(db.Integer, primary_key=True)
    name           = db.Column(db.String(255), nullable=False)
    email          = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash  = db.Column(db.String(255), nullable=True)   # NULL for OAuth-only accounts
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    google_id      = db.Column(db.String(255), nullable=True)   # NULL if not Google-linked
    created_at     = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at     = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc),
                               onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    refresh_tokens   = db.relationship(
        "RefreshToken",
        backref="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
        passive_deletes=True,
    )
    security_events  = db.relationship(
        "SecurityAuditLog",
        backref="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
        passive_deletes=True,
    )
    resumes = db.relationship(
        "Resume",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    certifications = db.relationship(
        "Certification",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Certification.issue_date.desc()",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} email={self.email!r}>"


# ─── Refresh Tokens ────────────────────────────────────────────────────────────

class RefreshToken(db.Model):
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        db.Index("idx_refresh_tokens_user", "user_id"),
    )

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = db.Column(db.String(255), nullable=False)   # bcrypt hash — never store plaintext
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked    = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def is_valid(self) -> bool:
        return not self.revoked and not self.is_expired

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<RefreshToken id={self.id} user_id={self.user_id} "
            f"revoked={self.revoked} expires={self.expires_at}>"
        )


# ─── Security Audit Log ────────────────────────────────────────────────────────

class SecurityAuditLog(db.Model):
    """
    Append-only log of security-relevant events.
    Retention policy: rows older than 90 days pruned by scheduled Celery task.

    payload JSONB shape (example):
    {
        "event":           "INJECTION_DETECTED",
        "stripped_count":  2,
        "patterns_hit":    ["ignore pr
        evious instructions"],
        "field":           "job_description",
        "truncated_input": "...first 200 chars..."
    }   
    """
    __tablename__ = "security_audit_log"
    __table_args__ = (
        db.Index("idx_audit_user",    "user_id"),
        db.Index("idx_audit_created", "created_at"),
    )

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,    # NULL allowed: pre-auth events (e.g. failed login attempt)
    )
    event_type = db.Column(db.String(80), nullable=False)  # e.g. 'LOGIN', 'INJECTION_DETECTED'
    ip_address = db.Column(db.String(45), nullable=True)   # IPv4 (15) or IPv6 (45); stored as string
    payload    = db.Column(db.JSON, nullable=True)         # structured metadata for the event
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # ── Convenience class-method for writing events ──────────────────────────

    @classmethod
    def log(
        cls,
        event_type: str,
        *,
        user_id: int | None = None,
        ip_address: str | None = None,
        payload: dict | None = None,
    ) -> "SecurityAuditLog":
        """Create and flush (not commit) a new audit log entry."""
        entry = cls(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            payload=payload,
        )
        db.session.add(entry)
        return entry

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<SecurityAuditLog id={self.id} event={self.event_type!r} "
            f"user_id={self.user_id} at={self.created_at}>"
        )


class Certification(db.Model):
    """Professional certification linked to a user profile."""

    __tablename__ = "certifications"
    __table_args__ = (
        db.Index("idx_certifications_user", "user_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = db.Column(db.String(255), nullable=False)
    issuing_organization = db.Column(db.String(255), nullable=True)
    issue_date = db.Column(db.Date, nullable=True)
    expiration_date = db.Column(db.Date, nullable=True)
    credential_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User", back_populates="certifications")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Certification id={self.id} user_id={self.user_id} name={self.name!r}>"
