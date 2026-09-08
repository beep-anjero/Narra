import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.schemas.error import ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


def error_response(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=ErrorResponse(error=ErrorDetail(code=code, message=message)).model_dump(),
        headers={"Cache-Control": "no-store"},
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        messages = {
            404: ("not_found", "This API endpoint does not exist."),
            405: ("method_not_allowed", "This endpoint does not support that HTTP method."),
        }
        code, message = messages.get(
            exc.status_code, ("request_failed", "The API could not accept this request.")
        )
        response = error_response(exc.status_code, code, message)
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _exc: RequestValidationError) -> JSONResponse:
        # Never echo input values: a later upload may contain sensitive dataset contents.
        return error_response(
            422, "invalid_request", "The request does not match this endpoint's schema."
        )

    @app.exception_handler(Exception)
    async def unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled analytics service error", exc_info=exc)
        return error_response(
            500,
            "internal_error",
            "The analytics service could not complete this request. Please retry.",
        )
