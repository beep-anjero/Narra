# Testing Narra

## Automated checks

```sh
pnpm install --frozen-lockfile
uv sync --directory apps/analytics --locked
pnpm check:all
pnpm --filter @narra/web exec playwright install chromium
pnpm test:e2e
```

`check:all` includes formatting, ESLint, strict TypeScript, Vitest/React Testing
Library, Next.js build, Ruff, and pytest. PostgreSQL policy tests run the real SQL
migrations in PGlite with test Auth and Storage schemas. Those tests exercise RLS
but cannot emulate the hosted Storage object service.

Playwright starts a production Next.js server on 3100 and FastAPI on 8107, using a
test-only service key. Keep those ports free. Build first; the suite never silently
reuses an unknown running server. It tests desktop Chromium and mobile Chromium,
real pipeline filtering/reset/download, error recovery, protected routes, and
axe WCAG A/AA accessibility. Only the network-failure test intercepts a request.

## Signed-in persistence lifecycle

Apply all migrations to a test Supabase project and configure the web application
for that project before building. Use a disposable confirmed test account. In
PowerShell, set credentials locally (never commit or paste them into reports):

```powershell
$env:E2E_EMAIL = '<test account email>'
$env:E2E_PASSWORD = '<test account password>'
pnpm test:e2e:lifecycle
```

This explicitly selected suite fails with a setup message when credentials are
missing. It logs in, creates a uniquely named project, uploads a real CSV, filters,
logs out, signs in again, restores and filters the saved analysis, checks preview,
and deletes that test project through the app. If interrupted, remove only its
`Narra E2E` project through Settings. The test account itself is retained.

For the full registration → login flow on **local/disposable Supabase** with email
autoconfirm enabled, set `E2E_CREATE_ACCOUNT=1` and use a new test email. The same
test first registers through Narra, then logs out and continues the login flow.
Do not disable production email confirmation to run tests. Hosted confirmation
links must be handled through the configured email delivery process.

Authenticated traces/screenshots are disabled to avoid recording credentials or
private datasets. Public demo screenshots and traces are under ignored
`apps/web/test-results` and `apps/web/playwright-report`. Never publish private
test artifacts. See stage verification files for actual runs and remaining limits.
