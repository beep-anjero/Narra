import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings


@pytest.mark.parametrize("origin", ["http://127.0.0.1:3000", "http://localhost:3000"])
def test_local_origins_are_allowed(client: TestClient, origin: str):
    response = client.get("/api/v1/health", headers={"Origin": origin})
    assert response.headers["access-control-allow-origin"] == origin
    assert "access-control-allow-credentials" not in response.headers


def test_allowed_preflight(client: TestClient):
    response = client.options(
        "/api/v1/health",
        headers={"Origin": "http://127.0.0.1:3000", "Access-Control-Request-Method": "GET"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3000"


def test_unknown_origin_is_not_allowed(client: TestClient):
    headers = {"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"}
    assert client.options("/api/v1/health", headers=headers).status_code == 400
    assert (
        "access-control-allow-origin" not in client.get("/api/v1/health", headers=headers).headers
    )


def test_unimplemented_methods_are_not_allowed_by_cors(client: TestClient):
    assert (
        client.options(
            "/api/v1/health",
            headers={"Origin": "http://127.0.0.1:3000", "Access-Control-Request-Method": "POST"},
        ).status_code
        == 400
    )


def test_configuration_is_isolated_per_application():
    with TestClient(
        create_app(Settings(_env_file=None, cors_origins=["https://narra.example"]))
    ) as client:
        response = client.get("/api/v1/health", headers={"Origin": "https://narra.example"})
        assert response.headers["access-control-allow-origin"] == "https://narra.example"
        assert (
            "access-control-allow-origin"
            not in client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"}).headers
        )
