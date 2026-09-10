from fastapi.testclient import TestClient


def test_versioned_health_returns_typed_liveness(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "narra-analytics", "version": "0.1.0"}
    assert response.headers["cache-control"] == "no-store"


def test_openapi_documents_only_implemented_api(client: TestClient):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert set(response.json()["paths"]) == {
        "/api/v1/health",
        "/api/v1/datasets/preview",
        "/api/v1/datasets/analyze",
        "/api/v1/datasets/statistics",
        "/api/v1/datasets/recommend-visualizations",
    }
    assert "HealthResponse" in response.json()["components"]["schemas"]
    assert client.get("/docs").status_code == 200


def test_unknown_route_returns_typed_error(client: TestClient):
    response = client.get("/api/v1/unknown")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    assert response.headers["cache-control"] == "no-store"


def test_wrong_method_preserves_allow_header(client: TestClient):
    response = client.post("/api/v1/health")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"
    assert "GET" in response.headers["allow"]
