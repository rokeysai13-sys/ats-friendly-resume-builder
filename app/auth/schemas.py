"""
app/auth/schemas.py
Marshmallow schemas for all auth request/response payloads.
Validation rules derived from BACKEND_STRUCTURE.md §4.1 and PRD v4.0.
"""
import re

from marshmallow import Schema, fields, validate, validates, ValidationError


# ─── Password complexity validator ────────────────────────────────────────────

_PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
)

def _validate_password_complexity(value: str) -> None:
    """
    Enforce: min 8 chars, at least one lowercase, one uppercase, one digit.
    Matches the PASSWORD_TOO_WEAK error condition in BACKEND_STRUCTURE.md §7.
    """
    if not _PASSWORD_RE.match(value):
        raise ValidationError(
            "Password must be at least 8 characters and contain an uppercase letter, "
            "a lowercase letter, and a digit."
        )


# ─── Request Schemas ──────────────────────────────────────────────────────────

class RegisterSchema(Schema):
    """POST /api/v1/auth/register"""
    name             = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255),
        metadata={"example": "Jane Smith"},
    )
    email            = fields.Email(
        required=True,
        metadata={"example": "jane@example.com"},
    )
    password         = fields.Str(
        required=True,
        load_only=True,
        validate=[
            validate.Length(min=8, error="Password must be at least 8 characters."),
            _validate_password_complexity,
        ],
        metadata={"example": "SecurePass123!"},
    )
    confirm_password = fields.Str(
        required=True,
        load_only=True,
        metadata={"example": "SecurePass123!"},
    )

    # Cross-field: passwords must match
    def validate_confirm_password(self, data: dict, **kwargs) -> dict:  # noqa: D102
        if data.get("password") != data.get("confirm_password"):
            raise ValidationError({"confirm_password": ["Passwords do not match."]})
        return data

    # Remove confirm_password from the loaded data — services don't need it
    def load(self, data, **kwargs):
        result = super().load(data, **kwargs)
        self.validate_confirm_password(result)
        result.pop("confirm_password", None)
        return result


class LoginSchema(Schema):
    """POST /api/v1/auth/login"""
    email    = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)


class VerifyEmailSchema(Schema):
    """POST /api/v1/auth/verify-email"""
    token = fields.Str(required=True)


class RefreshSchema(Schema):
    """POST /api/v1/auth/refresh"""
    refresh_token = fields.Str(required=True)


class LogoutSchema(Schema):
    """POST /api/v1/auth/logout"""
    refresh_token = fields.Str(required=True)


class ForgotPasswordSchema(Schema):
    """POST /api/v1/auth/forgot-password"""
    email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
    """POST /api/v1/auth/reset-password"""
    token        = fields.Str(required=True)
    password     = fields.Str(
        required=True,
        load_only=True,
        validate=[
            validate.Length(min=8, error="Password must be at least 8 characters."),
            _validate_password_complexity,
        ],
        data_key="password",
    )
    confirm_password = fields.Str(required=True, load_only=True)

    def load(self, data, **kwargs):
        result = super().load(data, **kwargs)
        if result.get("password") != result.get("confirm_password"):
            raise ValidationError({"confirm_password": ["Passwords do not match."]})
        result.pop("confirm_password", None)
        # Rename 'password' → 'new_password' so services.reset_password() signature matches
        result["new_password"] = result.pop("password")
        return result


class ChangePasswordSchema(Schema):
    """PATCH /api/v1/auth/password"""
    current_password = fields.Str(required=True, load_only=True)
    new_password     = fields.Str(
        required=True,
        load_only=True,
        validate=[
            validate.Length(min=8),
            _validate_password_complexity,
        ],
    )
    confirm_password = fields.Str(required=True, load_only=True)

    def load(self, data, **kwargs):
        result = super().load(data, **kwargs)
        if result.get("new_password") != result.get("confirm_password"):
            raise ValidationError({"confirm_password": ["Passwords do not match."]})
        result.pop("confirm_password", None)
        return result


# ─── Response Schemas ─────────────────────────────────────────────────────────

class UserResponseSchema(Schema):
    """Serialises a User model for API responses — never exposes password_hash."""
    id             = fields.Int(dump_only=True)
    name           = fields.Str(dump_only=True)
    email          = fields.Email(dump_only=True)
    email_verified = fields.Bool(dump_only=True)
    google_linked  = fields.Method("get_google_linked", dump_only=True)
    created_at     = fields.DateTime(dump_only=True, format="iso")

    def get_google_linked(self, obj) -> bool:
        return obj.google_id is not None


class TokenResponseSchema(Schema):
    """Serialises the token pair returned by login / refresh."""
    access_token  = fields.Str(dump_only=True)
    refresh_token = fields.Str(dump_only=True)
    expires_in    = fields.Int(dump_only=True)
    user          = fields.Nested(UserResponseSchema, dump_only=True)


class AccessTokenResponseSchema(Schema):
    """Serialises the access token returned by /refresh."""
    access_token = fields.Str(dump_only=True)
    expires_in   = fields.Int(dump_only=True)


# ─── Singleton instances (import these in routes) ─────────────────────────────

register_schema          = RegisterSchema()
login_schema             = LoginSchema()
verify_email_schema      = VerifyEmailSchema()
refresh_schema           = RefreshSchema()
logout_schema            = LogoutSchema()
forgot_password_schema   = ForgotPasswordSchema()
reset_password_schema    = ResetPasswordSchema()
change_password_schema   = ChangePasswordSchema()
user_response_schema     = UserResponseSchema()
token_response_schema    = TokenResponseSchema()
access_token_schema      = AccessTokenResponseSchema()
