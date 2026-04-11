import pytest

def test_update_skills_success(auth_client, auth_resume):
    payload = [
        {"name": "Python", "category": "Backend"},
        {"name": "Flask", "category": "Framework"}
    ]

    response = auth_client.put(
        f"/api/v1/resumes/{auth_resume.id}/skills",
        json=payload
    )

    if response.status_code != 200:
        print(f"DEBUG Response: {response.get_json()}")

    assert response.status_code == 200

def test_update_skills_not_owned(auth_client):
    # Try to update resume ID 9999 which doesn't exist / isn't owned by this user
    response = auth_client.put(
        "/api/v1/resumes/9999/skills",
        json=[{"name": "Python", "category": "Backend"}]
    )

    # Should return either 403 Forbidden or 404 Not Found depending on your service logic
    assert response.status_code in (403, 404)

def test_update_skills_validation_error(auth_client, auth_resume):
    # Send a dictionary instead of a LIST of dictionaries to trigger a validation error
    bad_payload = {"name": "Python", "category": "Backend"}

    response = auth_client.put(
        f"/api/v1/resumes/{auth_resume.id}/skills",
        json=bad_payload
    )

    assert response.status_code == 400
