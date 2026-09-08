# Narra analytics service

Stage 5 provides FastAPI, typed liveness, configuration, CORS, error responses,
OpenAPI documentation, and tests. CSV processing starts in Stage 6. There are no
mock dataset endpoints or database connections.

## Local development

Install Python 3.13 and uv (verified with Python 3.13.9 and uv 0.12.8).
From the repository root:

```sh
uv sync --directory apps/analytics --locked
pnpm analytics:dev
```

The virtual environment lives in `apps/analytics/.venv`. Dependencies are pinned
in `pyproject.toml` and `uv.lock`. pnpm manages JavaScript; uv manages Python.

- Liveness: `http://127.0.0.1:8000/api/v1/health`
- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI schema: `http://127.0.0.1:8000/openapi.json`

```json
{ "status": "ok", "service": "narra-analytics", "version": "0.1.0" }
```

Health is public and reports process liveness, not Supabase connectivity or dataset
processing readiness. Dataset endpoints are absent until implemented.

## Configuration

Optional `apps/analytics/.env`:

```dotenv
CORS_ORIGINS=["http://127.0.0.1:3000","http://localhost:3000"]
```

These are also the defaults. Environment variables override this file. Copy only
analytics settings, not the entire root `.env.example`; unrelated keys in this file
fail validation. An empty JSON array disables cross-origin browser access. HTTP(S)
origins are normalized and validated; credentials, wildcards, paths, queries, and
fragments are rejected. Restart after changing configuration.

Only GET is currently allowed by CORS. Cookies are not allowed. CORS is a browser
policy, not authentication. Upload authorization belongs to the upload integration;
the service currently handles no private data or mutations.

## Architecture

- `app/main.py`: application factory and composition.
- `app/settings.py`: validated Pydantic settings.
- `app/api/`: thin versioned router, health handler, and error handlers.
- `app/schemas/`: strict Pydantic response models.
- `app/services/`: reserved for parsing and deterministic algorithms.
- `app/models/`, `app/utils/`: reserved until needed.
- `tests/`: pytest HTTP, settings, CORS, and failure-contract tests.

Errors use `{"error":{"code":"...","message":"..."}}`. Unknown routes and
unsupported methods return 404 and 405. Request validation errors do not echo input
values. Unhandled exceptions produce a generic 500 response and a server-side
traceback for diagnosis. CORS preflight responses are managed by middleware.

No pandas, NumPy, multipart handling, persistence, or LLM dependencies are installed
before their implementation stage.

## Verification

```sh
pnpm analytics:check
pnpm check:all
```

The first runs Ruff lint/format checks and pytest. The second also runs all web
checks and the production frontend build. Format Python with:

```sh
uv run --directory apps/analytics --locked ruff format .
```

Tests use the ASGI test client and need no running server or external service.

## Production process

Install runtime dependencies and start without reload:

```sh
uv sync --directory apps/analytics --locked --no-dev
uv run --directory apps/analytics --locked --no-dev uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Configure the exact web origin in `CORS_ORIGINS`, terminate HTTPS at the hosting
proxy, and use `/api/v1/health` as the liveness probe. FastAPI runs separately from
Next.js. No deployment has been performed in Stage 5.
