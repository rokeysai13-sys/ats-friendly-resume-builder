from flask import Flask, jsonify, request
from flask_limiter.errors import RateLimitExceeded


class AppError(Exception):
    def __init__(self, code: str, http_status: int, message: str | None = None):
        if message is None:
            message = code.replace("_", " ").title()
        self.code = code
        self.message = message
        self.http_status = http_status
        super().__init__(message)


# ─── Error code constants ──────────────────────────────────────────────────────
# Each constant is a (code_string, http_status) tuple.
# Usage: raise AppError(*VALIDATION_ERROR, "Details here")

VALIDATION_ERROR        = ("VALIDATION_ERROR", 400)
JD_TOO_SHORT            = ("JD_TOO_SHORT", 400)
JD_LANGUAGE_UNSUPPORTED = ("JD_LANGUAGE_UNSUPPORTED", 400)
RESUME_EMPTY            = ("RESUME_EMPTY", 400)
PASSWORD_TOO_WEAK       = ("PASSWORD_TOO_WEAK", 400)
TOKEN_INVALID           = ("TOKEN_INVALID", 400)
TOKEN_EXPIRED           = ("TOKEN_EXPIRED", 400)
INVALID_CREDENTIALS     = ("INVALID_CREDENTIALS", 401)
TOKEN_REVOKED           = ("TOKEN_REVOKED", 401)
UNAUTHORIZED            = ("UNAUTHORIZED", 401)
EMAIL_NOT_VERIFIED      = ("EMAIL_NOT_VERIFIED", 403)
FORBIDDEN               = ("FORBIDDEN", 403)
RESUME_NOT_FOUND        = ("RESUME_NOT_FOUND", 404)
TEMPLATE_NOT_FOUND      = ("TEMPLATE_NOT_FOUND", 404)
LINK_NOT_FOUND          = ("LINK_NOT_FOUND", 404)
ANALYSIS_NOT_FOUND      = ("ANALYSIS_NOT_FOUND", 404)
COVER_LETTER_NOT_FOUND  = ("COVER_LETTER_NOT_FOUND", 404)
VERSION_NOT_FOUND       = ("VERSION_NOT_FOUND", 404)
LINK_EXPIRED            = ("LINK_EXPIRED", 410)
EMAIL_ALREADY_EXISTS    = ("EMAIL_ALREADY_EXISTS", 409)
RATE_LIMIT_EXCEEDED     = ("RATE_LIMIT_EXCEEDED", 429)
ANALYSIS_TIMEOUT        = ("ANALYSIS_TIMEOUT", 503)
COVER_LETTER_TIMEOUT    = ("COVER_LETTER_TIMEOUT", 503)
PDF_RENDER_FAILED       = ("PDF_RENDER_FAILED", 503)
LLM_UNAVAILABLE         = ("LLM_UNAVAILABLE", 503)
INTERNAL_ERROR          = ("INTERNAL_ERROR", 500)


# ─── Error handler registration ───────────────────────────────────────────────

def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(AppError)
    def handle_app_error(e: AppError):
        return jsonify({"error": e.code, "message": e.message}), e.http_status

    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit(_):
        if request.path.endswith("/ats-analyze"):
            return jsonify({
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "AI is cooling down. Please wait 60 seconds.",
            }), 429
        return jsonify({"error": "Too many requests. Please wait a moment."}), 429

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "NOT_FOUND", "message": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal(_):
        return jsonify({"error": "INTERNAL_ERROR", "message": "An unexpected error occurred"}), 500
