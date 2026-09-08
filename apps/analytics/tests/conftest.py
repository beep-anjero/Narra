import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings


@pytest.fixture
def client():
    with TestClient(create_app(Settings(_env_file=None)), raise_server_exceptions=False) as client:
        yield client
