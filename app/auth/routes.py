"""
app/auth/routes.py
Thin Flask Blueprint routes — all logic delegated to services.py.
Spec: IMPLEMENTATION_PLAN.md §1.2.6

JSON envelope format (from PRD v4.0):
  Success → { "message": "...", ...data }  or  { ...data }
  Error   → { "error": "CODE", "message": "..." }  (handled globally by AppError)
"""
from flask import Blueprint, request, jsonify, render_template, redirect, url_for, current_app
from marshmallow import ValidationError
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from werkzeug.security import check_password_hash as werkzeug_check_password_hash, generate_password_hash

from app.common.errors import AppError, VALIDATION_ERROR, INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED
from app.extensions import bcrypt, db, limiter
from . import services
from .models import User
from .schemas import (
    register_schema,
    login_schema,
    verify_email_schema,
    forgot_password_schema,
    reset_password_schema,
    user_response_schema,
)

auth_bp = Blueprint("auth", __name__)


def _wants_json_response() -> bool:
    accept_header = request.headers.get("Accept", "")
    return request.is_json or request.headers.get("X-Requested-With") == "XMLHttpRequest" or "application/json" in accept_header


def _extract_login_payload() -> tuple[str, str, bool]:
    source = request.get_json(silent=True) if request.is_json else request.form
    email = (source.get("email") or "").strip().lower()
    password = source.get("password") or ""
    remember = str(source.get("remember") or "").lower() in {"1", "true", "on", "yes"}
    return email, password, remember


def _verify_password(stored_hash: str, plain_password: str) -> bool:
    """Support legacy Werkzeug hashes and Flask-Bcrypt hashes."""
    if not stored_hash:
        return False

    try:
        return bcrypt.check_password_hash(stored_hash, plain_password)
    except (ValueError, TypeError):
        # Stored hash is not bcrypt (e.g., scrypt/pbkdf2 from Werkzeug).
        try:
            return werkzeug_check_password_hash(stored_hash, plain_password)
        except (ValueError, TypeError):
            # Malformed or unsupported hash format should not surface as 500.
            return False


def _first_validation_message(messages: object) -> str:
    if isinstance(messages, dict):
        for value in messages.values():
            if isinstance(value, list) and value:
                return str(value[0])
            if value:
                return str(value)
    if isinstance(messages, list) and messages:
        return str(messages[0])
    if isinstance(messages, str):
        return messages
    return "Please check your details and try again."


def _render_register_error(message: str, status: int = 400):
    if _wants_json_response():
        error_code = "EMAIL_ALREADY_EXISTS" if status == 409 else "VALIDATION_ERROR"
        return jsonify({"error": error_code, "message": message}), status

    is_development = current_app.config.get("ENV") != "production"
    return render_template("auth/register.html", is_development=is_development, error_message=message), status


# ─── POST /register ──────────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["GET", "POST"], strict_slashes=False)
@limiter.limit("5 per minute")
def register():
    """Render the registration page and handle account creation.

    GET serves the Digital Obsidian sign-up form.
    POST supports both JSON API clients and browser form submissions.
    """
    if request.method == "GET":
        is_development = current_app.config.get("ENV") != "production"
        return render_template("auth/register.html", is_development=is_development, error_message=None)

    payload = request.get_json(silent=True) if request.is_json else request.form
    try:
        data = register_schema.load(payload or {})
    except ValidationError as e:
        return _render_register_error(_first_validation_message(e.messages))

    email = data["email"].strip().lower()

    if request.is_json:
        user = services.register_user(
            name=data["name"],
            email=email,
            password=data["password"],
            email_verified=True,
        )

        return jsonify({
            "message": "Registered successfully. Please check your email to verify your account.",
            "user": user_response_schema.dump(user),
        }), 201

    if User.query.filter_by(email=email).first():
        return _render_register_error("An account with this email already exists.", 409)

    try:
        new_user = User(
            name=data["name"].strip(),
            email=email,
            password_hash=generate_password_hash(data["password"]),
            email_verified=True,
        )
        db.session.add(new_user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return _render_register_error("An account with this email already exists.", 409)

    login_user(new_user)

    return redirect(url_for("editor"))


# ─── POST /verify-email ──────────────────────────────────────────────────────

@auth_bp.post("/verify-email")
def verify_email():
    """Mark a user's email as verified using the token from their inbox."""
    try:
        data = verify_email_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        raise AppError(*VALIDATION_ERROR, str(e.messages))

    services.verify_email(data["token"])

    return jsonify({"message": "Email verified successfully."}), 200


# ─── POST /login ──────────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["GET", "POST"], strict_slashes=False)
@limiter.limit("5 per minute")
def login():
    """Render login page on GET; authenticate and create session on POST.
    Rate limited to 5 attempts per minute to prevent brute-force attacks.
    """
    if request.method == "GET":
        is_development = current_app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development, error_message=None)

    if request.is_json:
        json_payload = request.get_json(silent=True) or {}
        remember = bool(json_payload.pop("remember", False))
        try:
            data = login_schema.load(json_payload)
        except ValidationError as e:
            raise AppError(*VALIDATION_ERROR, str(e.messages))
        email = data["email"].lower().strip()
        password = data["password"]
    else:
        email, password, remember = _extract_login_payload()
        if not email or not password:
            message = "Please enter your email and password."
            if _wants_json_response():
                return jsonify({"error": "VALIDATION_ERROR", "message": message}), 400
            is_development = current_app.config.get("ENV") != "production"
            return render_template("auth/login.html", is_development=is_development, error_message=message), 400

    try:
        user = User.query.filter_by(email=email).first()
    except (OperationalError, ProgrammingError):
        db.session.rollback()
        message = "Login service is temporarily unavailable. Please try again shortly."
        if _wants_json_response():
            return jsonify({"error": "SERVICE_UNAVAILABLE", "message": message}), 503
        is_development = current_app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development, error_message=message), 503

    if not user or not user.password_hash:
        message = "Invalid email or password."
        if _wants_json_response():
            return jsonify({"error": INVALID_CREDENTIALS[0], "message": message}), 401
        is_development = current_app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development, error_message=message), 401

    if not user.email_verified:
        message = "Please verify your email before logging in."
        if _wants_json_response():
            return jsonify({"error": EMAIL_NOT_VERIFIED[0], "message": message}), 403
        is_development = current_app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development, error_message=message), 403

    if not _verify_password(user.password_hash, password):
        message = "Invalid email or password."
        if _wants_json_response():
            return jsonify({"error": INVALID_CREDENTIALS[0], "message": message}), 401
        is_development = current_app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development, error_message=message), 401

    login_user(user, remember=remember)

    redirect_target = url_for("editor")

    if _wants_json_response():
        return jsonify({
            "message": "Logged in successfully.",
            "redirect": redirect_target,
            "user": user_response_schema.dump(user),
        }), 200

    return redirect(redirect_target)


# ─── POST /refresh ────────────────────────────────────────────────────────────

@auth_bp.post("/refresh")
def refresh():
    """Deprecated in session-based auth mode."""
    return jsonify({"message": "Refresh token flow is disabled. Use session login."}), 410


# ─── POST /logout ─────────────────────────────────────────────────────────────

@auth_bp.get("/logout")
def logout_get():
    """End the current session and redirect to home."""
    if current_user.is_authenticated:
        logout_user()
    return redirect(url_for("index"))


@auth_bp.post("/logout")
def logout():
    """End the current session."""
    if current_user.is_authenticated:
        logout_user()

    return jsonify({"message": "Logged out successfully."}), 200


# ─── POST /forgot-password ───────────────────────────────────────────────────

@auth_bp.post("/forgot-password")
def forgot_password():
    """Request a password-reset email (no enumeration — always 200)."""
    try:
        data = forgot_password_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        raise AppError(*VALIDATION_ERROR, str(e.messages))

    services.forgot_password(data["email"])

    return jsonify({
        "message": "If that email is registered, a password reset link has been sent."
    }), 200


# ─── POST /reset-password ────────────────────────────────────────────────────

@auth_bp.post("/reset-password")
def reset_password():
    """Set a new password using the token from the reset email."""
    try:
        data = reset_password_schema.load(request.get_json(silent=True) or {})
    except ValidationError as e:
        raise AppError(*VALIDATION_ERROR, str(e.messages))

    services.reset_password(data["token"], data["new_password"])

    return jsonify({"message": "Password has been reset successfully."}), 200


# ─── GET /me (protected) ─────────────────────────────────────────────────────

@auth_bp.get("/me")
@login_required
def get_me():
    """Return the authenticated user's profile."""
    return jsonify({"user": user_response_schema.dump(current_user)}), 200
