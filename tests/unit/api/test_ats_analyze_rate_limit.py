def test_ats_analyze_rate_limit_returns_custom_cooldown_message(client, auth_client, auth_resume, monkeypatch):
    def fake_generate_ats_analysis(*args, **kwargs):
        return {
            "score": 88,
            "missing_keywords": [],
            "analysis_summary": "Strong match.",
            "found_keywords": ["python"],
        }

    monkeypatch.setattr("app.api.routes.generate_ats_analysis", fake_generate_ats_analysis)

    payload = {"job_description": "Build modern resume tooling with Python."}
    route = f"/api/v1/resumes/{auth_resume.id}/ats-analyze"

    for _ in range(5):
        response = auth_client.post(route, json=payload)
        assert response.status_code == 200

    limited_response = auth_client.post(route, json=payload)

    assert limited_response.status_code == 429
    assert limited_response.get_json() == {
        "error": "RATE_LIMIT_EXCEEDED",
        "message": "AI is cooling down. Please wait 60 seconds.",
    }
