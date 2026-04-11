import os
import pytest

from app import create_app
from app.extensions import db, bcrypt

# Note: Based on BACKEND_STRUCTURE.md, the models will reside in app.resume.models. 
# We wrap this in a try-except layer in case the module isn't generated yet.
try:
    from app.resume.models import Resume, Template
except ImportError:
    Resume = None
    Template = None


@pytest.fixture
def app():
    """
    Creates a fresh Flask app using create_app('development').
    Forces an in-memory SQLite DB and Testing configurations.
    """
    # Ensure environment settings are properly overridden for testing
    os.environ["FLASK_ENV"] = "development"
    os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    # Use a consistent secret for testing to avoid 401s
    os.environ["JWT_SECRET_KEY"] = "super-secret-test-jwt-key"

    app_instance = create_app("development")
    
    app_instance.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "WTF_CSRF_ENABLED": False,
        "JWT_SECRET_KEY": "super-secret-test-jwt-key",
        "JWT_ACCESS_TOKEN_EXPIRES": 3600,  # 1 hour
    })

    # Disable Redis during testing to avoid external service dependencies
    import app.extensions as ext
    ext.redis_client = None

    with app_instance.app_context():
        db.create_all()
        yield app_instance
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Provides a Flask test client."""
    return app.test_client()


@pytest.fixture
def auth_user(app):
    """Creates a dummy user and returns user metadata for session-based auth tests."""
    from app.auth.models import User
    from app.extensions import db
    
    with app.app_context():
        # 1. Create a dummy user
        user = User(
            name="Test Testerson", 
            email="tester@example.com", 
            password_hash="mock_hash", 
            email_verified=True
        )
        db.session.add(user)
        db.session.commit()
        
        # Return user details; tests now authenticate using Flask-Login session cookies.
        return {"user_id": user.id, "email": user.email}


@pytest.fixture
def auth_client(client, auth_user):
    """Provides a test client with an authenticated Flask-Login session."""
    with client.session_transaction() as sess:
        sess["_user_id"] = str(auth_user["user_id"])
        sess["_fresh"] = True
    return client


@pytest.fixture
def auth_resume(app, auth_user):
    """
    Generates a mock Resume in the database belonging to the authenticated test user.
    """
    if Resume is None or Template is None:
        pytest.skip("Resume or Template models are not yet implemented in app.resume.models.")

    # Resumes require a foreign key connection to a Template. Create a mock template:
    template = Template(
        name="Modern Test Template",
        html_path="templates/modern.html",
        css_path="static/css/modern.css",
        ats_safe=True
    )
    db.session.add(template)
    db.session.flush()

    # Create the mock resume
    resume = Resume(
        user_id=auth_user["user_id"],
        title="Mock Software Engineer Resume",
        template_id=template.id,
        personal_name="Test User",
        personal_email="test@example.com"
    )
    db.session.add(resume)
    db.session.commit()

    return resume
