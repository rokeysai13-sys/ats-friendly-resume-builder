from sqlalchemy.exc import OperationalError


def test_login_routes_accept_trailing_slash(client):
    for path in ("/login/", "/signin/", "/auth/login/", "/api/v1/auth/login/"):
        response = client.get(path)

        assert response.status_code == 200
        assert b"Sign In | Digital Obsidian" in response.data


def test_editor_trailing_slash_redirects_to_login(client):
    response = client.get("/editor/", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["Location"] == "/login?next=/editor/"


def test_login_rate_limit_returns_clean_json_error(client):
    payload = {"email": "tester@example.com", "password": "wrong-password"}

    for _ in range(5):
        response = client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 401

    limited_response = client.post("/api/v1/auth/login", json=payload)

    assert limited_response.status_code == 429
    assert limited_response.get_json() == {"error": "Too many requests. Please wait a moment."}


def test_login_returns_503_when_database_is_unavailable(client, monkeypatch):
    class BrokenQuery:
        def filter_by(self, **kwargs):
            raise OperationalError("SELECT ...", {}, Exception("no such table: users"))

    class BrokenUser:
        query = BrokenQuery()

    monkeypatch.setattr("app.auth.routes.User", BrokenUser)

    response = client.post(
        "/api/v1/auth/login",
        data={"email": "tester@example.com", "password": "irrelevant"},
        headers={"X-Requested-With": "XMLHttpRequest", "Accept": "application/json"},
    )

    assert response.status_code == 503
    assert response.get_json() == {
        "error": "SERVICE_UNAVAILABLE",
        "message": "Login service is temporarily unavailable. Please try again shortly.",
    }