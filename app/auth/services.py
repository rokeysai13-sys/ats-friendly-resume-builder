"""
app/auth/services.py
Auth business logic — routes stay thin; all work happens here.
Spec: IMPLEMENTATION_PLAN.md §1.2.4
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app, request

from app.common.errors import (
    AppError,
    EMAIL_ALREADY_EXISTS,
    EMAIL_NOT_VERIFIED,
    INVALID_CREDENTIALS,
    PASSWORD_TOO_WEAK,
    TOKEN_EXPIRED,
    TOKEN_INVALID,
    TOKEN_REVOKED,
)
from app.extensions import bcrypt, db, redis_client
from .models import RefreshToken, SecurityAuditLog, User


# ─── Helpers ──────────────────────────────────────────────────────────────────

_PASSWORD_MIN_LENGTH = 8


def _now_utc() -> datetime:
    """Timezone-aware UTC now (avoids deprecation of datetime.utcnow)."""
    return datetime.now(timezone.utc)


def _issue_access_token(user_id: int) -> tuple[str, int]:
    """
    Return (encoded_jwt, expires_in_seconds).
    Payload: {sub: user_id, iat: now, exp: now + configured TTL}.
    """
    expires_in = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]  # seconds
    payload = {
        "sub": user_id,
        "iat": _now_utc(),
        "exp": _now_utc() + timedelta(seconds=expires_in),
    }
    token = jwt.encode(
        payload,
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return token, expires_in


def _sha256(value: str) -> str:
    """Hex-digest SHA-256 — used for Redis lookup keys (NOT password storage)."""
    return hashlib.sha256(value.encode()).hexdigest()


def _get_client_ip() -> str | None:
    """Best-effort client IP from X-Forwarded-For or remote_addr."""
    return request.headers.get("X-Forwarded-For", request.remote_addr)


# ─── Register ─────────────────────────────────────────────────────────────────

def register_user(name: str, email: str, password: str, email_verified: bool = True) -> User:
    """
    1. Check email uniqueness → EMAIL_ALREADY_EXISTS
    2. Hash password with bcrypt (cost 12)
    3. Insert User row (email_verified=True for immediate access)
    4. Generate email-verification JWT, store SHA-256 hash in Redis (TTL 24h)
    5. TODO: enqueue send_verification_email Celery task
    6. Return user
    """
    email = email.lower().strip()

    if User.query.filter_by(email=email).first():
        raise AppError(*EMAIL_ALREADY_EXISTS, "An account with this email already exists.")

    pw_hash = bcrypt.generate_password_hash(password, rounds=12).decode("utf-8")
    user = User(name=name.strip(), email=email, password_hash=pw_hash, email_verified=email_verified)
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    # Verification token (JWT, 24h TTL)
    verify_token = jwt.encode(
        {"sub": user.id, "purpose": "verify_email", "exp": _now_utc() + timedelta(hours=24)},
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    token_hash = _sha256(verify_token)

    if redis_client is not None:
        redis_client.setex(f"session:verify:{token_hash}", 86400, str(user.id))

    # Audit
    SecurityAuditLog.log(
        "REGISTER",
        user_id=user.id,
        ip_address=_get_client_ip(),
        payload={"email": email},
    )

    db.session.commit()

    # TODO Step 2: enqueue Celery task → send_verification_email(user.email, verify_token)

    return user


# ─── Verify Email ─────────────────────────────────────────────────────────────

def verify_email(token: str) -> None:
    """
    1. Decode JWT, extract user_id
    2. Check Redis key session:verify:{sha256(token)} → TOKEN_INVALID / TOKEN_EXPIRED
    3. Set user.email_verified = True
    4. Delete Redis key
    """
    try:
        payload = jwt.decode(
            token,
            current_app.config["JWT_SECRET_KEY"],
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        raise AppError(*TOKEN_EXPIRED, "Verification link has expired.")
    except jwt.InvalidTokenError:
        raise AppError(*TOKEN_INVALID, "Invalid verification token.")

    if payload.get("purpose") != "verify_email":
        raise AppError(*TOKEN_INVALID, "Token is not a verification token.")

    token_hash = _sha256(token)
    redis_key = f"session:verify:{token_hash}"

    if redis_client is not None:
        if not redis_client.exists(redis_key):
            raise AppError(*TOKEN_INVALID, "Verification token has already been used or expired.")
        redis_client.delete(redis_key)

    user = db.session.get(User, payload["sub"])
    if not user:
        raise AppError(*TOKEN_INVALID, "Invalid verification token.")

    user.email_verified = True
    db.session.commit()


# ─── Login ────────────────────────────────────────────────────────────────────

def login_user(email: str, password: str) -> dict:
    """
    1. Look up user by email → INVALID_CREDENTIALS (never reveal "email not found")
    2. Check email_verified → EMAIL_NOT_VERIFIED
    3. bcrypt.check_password_hash → INVALID_CREDENTIALS
    4. Issue access token (JWT HS256, exp: configured TTL)
    5. Generate 64-byte random refresh token
    6. Hash refresh token with bcrypt (cost 12), store RefreshToken row (exp: 30d)
    7. Log LOGIN event
    8. Return {access_token, refresh_token, expires_in, user}
    """
    email = email.lower().strip()
    user = User.query.filter_by(email=email).first()

    if not user or not user.password_hash:
        raise AppError(*INVALID_CREDENTIALS, "Invalid email or password.")

    if not user.email_verified:
        raise AppError(*EMAIL_NOT_VERIFIED, "Please verify your email before logging in.")

    if not bcrypt.check_password_hash(user.password_hash, password):
        # Audit failed attempt
        SecurityAuditLog.log(
            "LOGIN_FAILED",
            user_id=user.id,
            ip_address=_get_client_ip(),
        )
        db.session.commit()
        raise AppError(*INVALID_CREDENTIALS, "Invalid email or password.")

    # Access token
    access_token, expires_in = _issue_access_token(user.id)

    # Refresh token — 64 random bytes, hex-encoded
    raw_refresh = secrets.token_hex(64)
    refresh_hash = bcrypt.generate_password_hash(raw_refresh, rounds=12).decode("utf-8")
    refresh_expires_seconds = current_app.config["JWT_REFRESH_TOKEN_EXPIRES"]

    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=_now_utc() + timedelta(seconds=refresh_expires_seconds),
    )
    db.session.add(rt)

    SecurityAuditLog.log("LOGIN", user_id=user.id, ip_address=_get_client_ip())
    db.session.commit()

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "expires_in": expires_in,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "email_verified": user.email_verified,
        },
    }


# ─── Refresh ──────────────────────────────────────────────────────────────────

def refresh_access_token(raw_refresh_token: str) -> dict:
    """
    1. Load all non-revoked RefreshToken rows (brute-force-safe for MVP scale)
    2. bcrypt.check_password_hash each until match → TOKEN_INVALID
    3. Check not expired → TOKEN_EXPIRED, not revoked → TOKEN_REVOKED
    4. Issue new access token
    """
    candidates = RefreshToken.query.filter_by(revoked=False).all()

    matched: RefreshToken | None = None
    for rt in candidates:
        if bcrypt.check_password_hash(rt.token_hash, raw_refresh_token):
            matched = rt
            break

    if matched is None:
        raise AppError(*TOKEN_INVALID, "Invalid refresh token.")

    if matched.is_expired:
        raise AppError(*TOKEN_EXPIRED, "Refresh token has expired.")

    if matched.revoked:
        raise AppError(*TOKEN_REVOKED, "Refresh token has been revoked.")

    access_token, expires_in = _issue_access_token(matched.user_id)

    return {
        "access_token": access_token,
        "expires_in": expires_in,
    }


# ─── Logout ───────────────────────────────────────────────────────────────────

def logout_user(raw_refresh_token: str) -> None:
    """Revoke the matching refresh token row."""
    candidates = RefreshToken.query.filter_by(revoked=False).all()

    for rt in candidates:
        if bcrypt.check_password_hash(rt.token_hash, raw_refresh_token):
            rt.revoked = True
            SecurityAuditLog.log(
                "LOGOUT",
                user_id=rt.user_id,
                ip_address=_get_client_ip(),
            )
            db.session.commit()
            return

    # Silently succeed even if token not found — don't reveal state
    return


# ─── Forgot Password ─────────────────────────────────────────────────────────

def forgot_password(email: str) -> None:
    """
    1. Look up user (silently return if not found — no enumeration)
    2. Generate reset JWT (exp: +1h), store SHA-256 hash in Redis (TTL 3600s)
    3. TODO: enqueue send_password_reset_email task
    """
    email = email.lower().strip()
    user = User.query.filter_by(email=email).first()

    if not user:
        return  # no enumeration

    reset_token = jwt.encode(
        {"sub": user.id, "purpose": "reset_password", "exp": _now_utc() + timedelta(hours=1)},
        current_app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    token_hash = _sha256(reset_token)

    if redis_client is not None:
        redis_client.setex(f"session:reset:{token_hash}", 3600, str(user.id))

    SecurityAuditLog.log(
        "FORGOT_PASSWORD",
        user_id=user.id,
        ip_address=_get_client_ip(),
    )
    db.session.commit()

    # TODO Step 2: enqueue Celery task → send_password_reset_email(user.email, reset_token)


# ─── Reset Password ──────────────────────────────────────────────────────────

def reset_password(token: str, new_password: str) -> None:
    """
    1. Decode JWT, check Redis key → TOKEN_INVALID / TOKEN_EXPIRED
    2. Update user.password_hash with new bcrypt hash
    3. Delete Redis key, revoke ALL existing refresh tokens for user
    """
    try:
        payload = jwt.decode(
            token,
            current_app.config["JWT_SECRET_KEY"],
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        raise AppError(*TOKEN_EXPIRED, "Password reset link has expired.")
    except jwt.InvalidTokenError:
        raise AppError(*TOKEN_INVALID, "Invalid password reset token.")

    if payload.get("purpose") != "reset_password":
        raise AppError(*TOKEN_INVALID, "Token is not a password-reset token.")

    token_hash = _sha256(token)
    redis_key = f"session:reset:{token_hash}"

    if redis_client is not None:
        if not redis_client.exists(redis_key):
            raise AppError(*TOKEN_INVALID, "Reset token has already been used or expired.")
        redis_client.delete(redis_key)

    user = db.session.get(User, payload["sub"])
    if not user:
        raise AppError(*TOKEN_INVALID, "Invalid password reset token.")

    # Update password
    user.password_hash = bcrypt.generate_password_hash(new_password, rounds=12).decode("utf-8")

    # Revoke all existing refresh tokens for this user (force re-login)
    RefreshToken.query.filter_by(user_id=user.id, revoked=False).update({"revoked": True})

    SecurityAuditLog.log(
        "PASSWORD_RESET",
        user_id=user.id,
        ip_address=_get_client_ip(),
    )
    db.session.commit()
