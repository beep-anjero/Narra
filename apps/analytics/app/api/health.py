from fastapi import APIRouter, Response

from app import __version__
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Check service liveness")
def health(response: Response) -> HealthResponse:
    """Process liveness only; this service has no database or external dependencies."""
    response.headers["Cache-Control"] = "no-store"
    return HealthResponse(version=__version__)
