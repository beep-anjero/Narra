# Stage 17: documentation and deployment packaging

The README covers overview, actual screenshots, features, demo, architecture,
stack, local setup, environment variables, database setup, analytics and ranking
logic, tests, deployment, and roadmap. Current architecture and the deployment
runbook replace historical stage descriptions as the primary reference.

Next.js standalone output builds successfully and includes the five sample CSVs.
No `.env` file was found in that generated standalone tree. The local startup
script prepares static assets; Dockerfiles and Compose package the two applications
with non-root users, health checks, and runtime-only private credentials.

Final verification passed: `pnpm check:all` completed with 167 Vitest tests,
134 pytest tests, formatting, ESLint, Ruff, strict TypeScript, and the production
standalone build. `pnpm test:e2e` passed all eight desktop/mobile browser tests
against that standalone server. The final screenshots show shorter daily date
labels with their common year retained on the axis; source values are unchanged.

Release checks still outstanding:

- The hosted Supabase datasets migration was not applied in this session. The final
  read-only check still returned `PGRST205` for the datasets endpoint.
- The signed-in registration/upload/save/reopen/delete E2E test needs a configured
  disposable account and test Supabase environment; it has not been run.
- Docker image builds and hosted deployment were not executed because Docker and
  a deployment target are unavailable here. No public deployment is claimed.

These are verification/setup limitations, not simulated implementations. Production
code uses real Supabase Auth, RLS, Storage, SQL transactions, and FastAPI processing.
