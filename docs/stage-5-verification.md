# Stage 5 verification

Verified locally on 2026-09-08 with Python 3.13.9, uv 0.12.8, Node 24.11.0,
and pnpm 11.19.0. Stage 6 has not started.

## Scope

FastAPI application factory, `/api/v1/health`, Pydantic health/error/settings models,
explicit CORS origins, error handling, locked Python dependencies, Ruff, pytest,
root development/check commands, and service documentation.

No dataset endpoints, CSV parsing, Supabase changes, persistence, or frontend API
integration were added. Existing services/models/utils directories remain reserved
until real processing code requires them.

## Backend checks

- `uv sync --directory apps/analytics --locked`: passed.
- `uv run --directory apps/analytics --locked ruff format .`: formatted Python.
- `pnpm analytics:check`: Ruff lint and format passed; **23 pytest tests passed**.
- Tests cover typed health, OpenAPI, unknown routes, method errors, allowlisted and
  rejected CORS origins/preflights, configuration validation/overrides, and safe
  validation/internal error responses. No external services or credentials required.
- Temporary live Uvicorn process on port 8100: health returned 200 and the expected
  JSON; allowed preflight and OpenAPI checks passed. The temporary process was stopped.

## Dependency corrections

Frontend regression checks also passed: `pnpm check` completed formatting, ESLint
with zero warnings, strict TypeScript, **80 Vitest tests**, and the production
Next.js build. Final documentation formatting and `git diff --check` passed.

The first pytest run failed on a Starlette warning about its legacy httpx test
transport. Replaced that development dependency with httpx2, as required by the
installed Starlette source. A second warning identified Starlette 1.6 using an
AnyIO alias deprecated in 4.15. Added a documented `anyio<4.15` compatibility
constraint; the lock resolves 4.14.2. Warnings remain errors; none were suppressed.
Revisit the constraint when upgrading Starlette.

## Operational limits

Health reports process liveness only. It does not claim dataset processing or
database readiness. CORS is not authorization; private upload authorization is part
of the next integration stage. Only GET is allowed by current CORS configuration.
No deployment or hosted Supabase lifecycle verification occurred in this stage.
