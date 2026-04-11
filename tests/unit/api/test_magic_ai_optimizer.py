def test_magic_ai_optimizer_accepts_current_text_and_target_role(auth_client, monkeypatch):
    captured = {}

    def fake_optimize_bullet(current_text, target_role):
        captured["current_text"] = current_text
        captured["target_role"] = target_role
        return {
            "optimized_bullet": "Architected a scalable feature set as measured by faster delivery, by streamlining the workflow.",
            "source": "gemini",
        }

    monkeypatch.setattr("app.api.routes.optimize_bullet", fake_optimize_bullet)

    response = auth_client.post(
        "/api/v1/ai/optimize-bullet",
        json={
            "current_text": "Built resume tools and improved workflow speed.",
            "target_role": "Senior Backend Engineer",
        },
    )

    assert response.status_code == 200
    assert response.get_json() == {
        "optimized_bullet": "Architected a scalable feature set as measured by faster delivery, by streamlining the workflow.",
        "source": "gemini",
    }
    assert captured == {
        "current_text": "Built resume tools and improved workflow speed.",
        "target_role": "Senior Backend Engineer",
    }
