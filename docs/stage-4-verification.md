# Stage 4 verification

Verified locally on 2026-09-08. Stage 5 has not started.

## Implemented

- Project creation, paginated workspace cards, saved project details, rename and
  description editing, and confirmed deletion.
- Centralized server-only queries and validated Server Actions, with authenticated
  ownership checks and independent PostgreSQL RLS.
- Restricted column grants and database-managed update timestamps.
- Loading, empty, unavailable-project, validation, and database error states.
- Additive migration `20260908000100_projects.sql`, applied after the profiles migration.

## Commands and results

- `pnpm format`: passed.
- `pnpm check`: passed formatting, ESLint with zero warnings, TypeScript, all 80 tests
  across 12 files, and the Next.js production build.
- `git diff --check`: passed.
- Production server launched temporarily with
  `pnpm --filter @narra/web exec next start -p 3100` and stopped after checks.
- Node fetch smoke checks: `/` and `/login` returned 200. Unauthenticated requests
  to `/dashboard`, `/dashboard/new`, `/project/[id]`, and project settings returned
  307 redirects to login.

The 23 new tests cover actual PostgreSQL migration execution, owner creation,
cross-account isolation, anonymous denial, immutable ownership/timestamps, name
constraints, rename timestamps, deletion, action authentication/validation/error
handling, query pagination/ownership, and labeled form error/confirmation behavior.

## Remaining hosted checks

The hosted projects migration was not applied by this implementation. Apply it once
using `docs/supabase-setup.md`, then verify the two-account lifecycle checklist.
Unit action/query tests mock provider transport; SQL tests execute migrations in
PGlite. Neither substitutes for live Supabase or authenticated browser E2E testing.
Responsive layouts are implemented but have not received browser visual QA in this
stage. No CSV upload or dataset persistence is represented as complete.
