from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings


def test_validation_error_does_not_echo_input():
    app = create_app(Settings(_env_file=None))

    @app.get("/test-validation")
    def validate(count: int):
        return {"count": count}

    with TestClient(app) as client:
        response = client.get("/test-validation?count=sensitive-value")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request"
    assert "sensitive-value" not in response.text


def test_unhandled_error_does_not_expose_internal_details():
    app = create_app(Settings(_env_file=None))

    @app.get("/test-error")
    def fail():
        raise RuntimeError("private internal detail")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test-error")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "private internal detail" not in response.text
