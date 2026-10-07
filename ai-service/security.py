"""Only the backend may call this service.

Every request must carry the shared key in the X-Internal-Key header (AI_SERVICE_KEY, set for both
the backend and this service); without it the answer is 401. Open: GET /health (Docker and the
backend's health check) and the API documentation (/docs, /openapi.json), which hold no data.
The browser never calls this service: profile drafts go through the backend too. In Docker the
service is only on the internal network, with no published port.

The service refuses to start without a key, like the backend without its JWT secret.
"""

import contextvars
import hmac
import os
import re

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

KEY_HEADER = "X-Internal-Key"
REQUEST_ID_HEADER = "X-Request-Id"
OPEN_PATHS = {"/health", "/docs", "/openapi.json", "/docs/oauth2-redirect", "/redoc"}
MIN_KEY_LENGTH = 32
_VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9-]{8,64}")

# The backend's request id, so this service's errors and logs use the same correlation id.
request_id = contextvars.ContextVar("request_id", default=None)


def configured_key():
    key = os.getenv("AI_SERVICE_KEY", "").strip()
    if len(key) < MIN_KEY_LENGTH:
        raise RuntimeError(
            f"AI_SERVICE_KEY must be set to a random value of at least {MIN_KEY_LENGTH} characters, the same "
            "for the backend and the ai-service (`npm run dev` generates one in .env).")
    return key


def install_internal_key(app: FastAPI, key: str, error_body) -> None:
    expected = key.encode()

    @app.middleware("http")
    async def require_internal_key(request: Request, call_next):
        incoming_id = request.headers.get(REQUEST_ID_HEADER, "")
        token = request_id.set(incoming_id if _VALID_REQUEST_ID.fullmatch(incoming_id) else None)
        try:
            if request.url.path not in OPEN_PATHS:
                given = request.headers.get(KEY_HEADER, "").encode()
                if not hmac.compare_digest(given, expected):
                    return JSONResponse(error_body("AUTH_REQUIRED", "This service only answers the HireHub backend."),
                                        status_code=401)
            return await call_next(request)
        finally:
            request_id.reset(token)
