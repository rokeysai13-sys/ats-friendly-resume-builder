from app.auth.models import User
from app.extensions import db


def test_register_page_renders(client):
    response = client.get("/register")

    assert response.status_code == 200
    assert b"Sign Up | Digital Obsidian" in response.data
    assert b"Already have an account?" in response.data


def test_register_rejects_password_mismatch(client):
    response = client.post(
        "/register",
        data={
            "name": "Jane Smith",
            "email": "jane@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass456!",
        },
    )

    assert response.status_code == 400
    assert b"Passwords do not match." in response.data


def test_register_rejects_duplicate_email(client, app):
    with app.app_context():
        db.session.add(
            User(
                name="Existing User",
                email="jane@example.com",
                password_hash="pbkdf2:sha256:dummy",
                email_verified=True,
            )
        )
        db.session.commit()

    response = client.post(
        "/register",
        data={
            "name": "Jane Smith",
            "email": "jane@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
        },
    )

    assert response.status_code == 409
    assert b"An account with this email already exists." in response.data


def test_register_logs_user_in_and_redirects_to_editor(client, app):
    response = client.post(
        "/register",
        data={
            "name": "Jane Smith",
            "email": "jane@example.com",
            "password": "SecurePass123!",
            "confirm_password": "SecurePass123!",
        },
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["Location"] == "/editor"

    with app.app_context():
        user = User.query.filter_by(email="jane@example.com").first()
        assert user is not None
        assert user.email_verified is True

    editor_response = client.get("/editor")
    assert editor_response.status_code == 200