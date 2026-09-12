from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.errors import register_error_handlers
from app.api.router import router
from app.schemas.error import ErrorResponse
from app.services.analysis_cache import AnalysisCache
from app.settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    configuration = settings if settings is not None else Settings()
    app = FastAPI(
        title="Narra Analytics API",
        version=__version__,
        description="Deterministic analytics service with CSV previews and schema inference.",
        responses={500: {"model": ErrorResponse, "description": "Internal service error"}},
    )
    app.state.settings = configuration
    app.state.analysis_cache = AnalysisCache()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Accept", "Content-Type"],
    )
    register_error_handlers(app)
    app.include_router(router)
    return app


app = create_app()
