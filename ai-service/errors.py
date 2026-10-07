"""Every error this service returns has the same body as the backend's:

    {"code": "...", "message": "...", "correlationId": "...", "fieldErrors": {...}}

`message` is a sentence a user can read, `code` is stable, `correlationId` is the backend's request
id (X-Request-Id) when there is one and appears in the log line for the same error, and `fieldErrors` (field -> message) is present only for request validation errors.
"""

import logging
import uuid

from security import request_id

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("hirehub.ai.errors")

_CODES = {400: "BAD_REQUEST", 401: "AUTH_REQUIRED", 403: "FORBIDDEN", 404: "NOT_FOUND",
          405: "METHOD_NOT_ALLOWED", 413: "FILE_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE",
          422: "VALIDATION_FAILED", 503: "SERVICE_UNAVAILABLE"}
_MESSAGES = {404: "Not found.", 405: "This action isn't available here."}


def error_body(code, message, field_errors=None):
    body = {"code": code, "message": message, "correlationId": request_id.get() or str(uuid.uuid4())}
    if field_errors:
        body["fieldErrors"] = field_errors
    return body


def _respond(request: Request, status: int, body: dict) -> JSONResponse:
    level = logging.WARNING if status >= 500 else logging.INFO
    log.log(level, "[%s] %s %s on %s %s: %s", body["correlationId"], status, body["code"],
            request.method, request.url.path, body["message"])
    return JSONResponse(body, status_code=status)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        # Our own errors are raised as HTTPException(detail={"code", "message"}).
        if isinstance(exc.detail, dict) and "message" in exc.detail:
            body = error_body(exc.detail.get("code") or _CODES.get(exc.status_code, "ERROR"), exc.detail["message"])
        else:
            message = _MESSAGES.get(exc.status_code) or (exc.detail if isinstance(exc.detail, str) else "The request failed.")
            body = error_body(_CODES.get(exc.status_code, "ERROR"), message)
        return _respond(request, exc.status_code, body)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        fields = {}
        for error in exc.errors():
            location = [str(part) for part in error.get("loc", ()) if part not in ("body", "query", "path")]
            fields.setdefault(".".join(location) or "request", error.get("msg", "Invalid value."))
        message = " ".join(f"{name}: {text}." for name, text in fields.items())
        return _respond(request, 422, error_body("VALIDATION_FAILED", message, fields))

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        body = error_body("INTERNAL_ERROR", "An unexpected error occurred. Please try again later.")
        log.error("[%s] Unhandled exception on %s %s", body["correlationId"], request.method, request.url.path,
                  exc_info=exc)
        return JSONResponse(body, status_code=500)
