import os
import redis as redis_lib
from flask import Flask
from sqlalchemy.exc import OperationalError, ProgrammingError
from .config import config_map
from .extensions import db, migrate, bcrypt, celery, login_manager, limiter
from . import extensions as ext
from flask import render_template, request, jsonify, redirect, url_for
from flask_login import login_required, current_user


def create_app(env: str | None = None) -> Flask:
    env = env or os.getenv("FLASK_ENV", "development")
    app = Flask(__name__)
    app.config.from_object(config_map[env])

    # ✅ PRODUCTION-READY: No demo users are auto-created on startup.
    # All users MUST be created via the /register endpoint.
    # Demo data is only created by running seed.py manually in development.

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "login_page"
    login_manager.login_message = "Please sign in to continue."
    limiter.init_app(app)

    # Redis client (non-fatal if Redis is not running in local dev)
    try:
        ext.redis_client = redis_lib.from_url(app.config["REDIS_URL"], decode_responses=True)
        ext.redis_client.ping()
    except Exception:
        import warnings
        warnings.warn("Redis unavailable — rate limiting and caching disabled.", RuntimeWarning)
        ext.redis_client = None


    # Celery
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
    )
    celery.conf.task_routes = {
        "app.ats.tasks.*": {"queue": "nlp"},
        "app.cover_letter.tasks.*": {"queue": "nlp"},
        "app.pdf.tasks.*": {"queue": "pdf"},
    }

    # 1. Force Flask-Migrate to discover all models
    from .auth import models  # noqa: F401
    from .resume import models  # noqa: F401

    @login_manager.user_loader
    def load_user(user_id: str):
        from .models import User
        try:
            return db.session.get(User, int(user_id))
        except (TypeError, ValueError, OperationalError, ProgrammingError):
            # If DB schema is not initialized yet, treat as anonymous user
            return None

    @login_manager.unauthorized_handler
    def unauthorized_handler():
        if request.path.startswith("/api/"):
            return jsonify({"error": "UNAUTHORIZED", "message": "Authentication required."}), 401
        next_url = request.full_path if request.query_string else request.path
        return redirect(url_for("login_page", next=next_url))

    # Rate limiter error handler for 429 errors
    @app.errorhandler(429)
    def ratelimit_handler(e):
        """Handle rate limit errors (HTTP 429)."""
        if request.path.startswith("/api/"):
            return jsonify({
                "error": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please wait a moment."
            }), 429
        # Fallback for non-API routes
        return render_template("auth/login.html", is_development=app.config.get("ENV") != "production", error_message="Too many requests. Please try again later."), 429

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")

        is_secure_request = request.is_secure or request.headers.get("X-Forwarded-Proto", "").lower() == "https"
        if app.config.get("SESSION_COOKIE_SECURE") and is_secure_request:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        return response

    # 2. Register the Authentication endpoints
    from .auth.routes import auth_bp, register as auth_register_view
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")

    # Register the Resume endpoints
    from .resume.routes import resume_bp
    app.register_blueprint(resume_bp, url_prefix="/api/v1")

    # Register authenticated API endpoints
    from .api.routes import api_bp
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    @app.route("/", strict_slashes=False)
    def index():
        """Always render the landing page at root URL."""
        return render_template("landing.html")

    @app.route("/editor", strict_slashes=False)
    @login_required
    def editor():
        """Resume editor — authenticated users only."""
        return render_template("index.html")

    @app.route("/dashboard", strict_slashes=False)
    @login_required
    def dashboard():
        """Render the resume dashboard with all user's resumes."""
        return render_template("dashboard.html")

    @app.route("/login", strict_slashes=False)
    def login_page():
        is_development = app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development)

    @app.route("/register", methods=["GET", "POST"], strict_slashes=False)
    def register_page():
        return auth_register_view()

    @app.route("/signup", methods=["GET", "POST"], strict_slashes=False)
    def signup_page():
        return auth_register_view()

    @app.route("/signin", strict_slashes=False)
    def signin_page():
        is_development = app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development)

    @app.route("/auth/login", strict_slashes=False)
    def auth_login_page_alias():
        is_development = app.config.get("ENV") != "production"
        return render_template("auth/login.html", is_development=is_development)

    @app.route("/auth/register", methods=["GET", "POST"], strict_slashes=False)
    def auth_register_page_alias():
        return auth_register_view()

    @app.route("/logout", strict_slashes=False)
    def logout_page():
        return redirect(url_for("auth.logout_get"))

    # Global error handlers
    from .common.errors import register_error_handlers
    register_error_handlers(app)

    return app
