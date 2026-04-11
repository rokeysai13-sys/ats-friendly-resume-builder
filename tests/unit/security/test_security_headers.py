from app import create_app
from app.extensions import db


def test_production_security_headers_and_cookie_defaults(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret-key")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")

    app = create_app("production")
    app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        JWT_SECRET_KEY="test-jwt-secret-key",
    )

    with app.app_context():
        db.create_all()

    client = app.test_client()
    response = client.get("/login", headers={"X-Forwarded-Proto": "https"})

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"
    assert app.config["SESSION_COOKIE_SECURE"] is True
    assert app.config["REMEMBER_COOKIE_SECURE"] is True
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True
    assert app.config["REMEMBER_COOKIE_HTTPONLY"] is True