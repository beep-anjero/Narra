# Stage 13: synchronized dashboard filters

Verification: 134 pytest tests and 155 Vitest tests passed. Ruff, Prettier,
ESLint, strict TypeScript, and the Next.js production build passed. The initial unrestricted Vitest run hit
five-second timeouts in two UI tests; all tests passed with two workers, now the
default to limit jsdom resource contention without increasing test timeouts.

The filter panel supports category multiselect, inclusive numeric bounds, and
inclusive UTC calendar dates. Apply sends one small JSON request; reset restores
the original dataset. All charts, KPIs, insights, statistics, and preview rows
consume the same response. A failed request retains the previous dashboard.

Backend tests cover rows beyond the browser preview, combined filters, date-end
inclusion, empty results, reset, invalid input, request limits, cache expiry,
eviction, and cross-user/project isolation. Frontend tests cover draft versus
applied state, reset, invalid bounds, failed requests, empty results, strict
contracts, independent stores, and authenticated route ownership checks.

The temporary cache design and deployment constraints are documented in
[Stage 13 design](stage-13-design.md). Cache entries are cleaned up on cache access
or insertion; expiry denies further use even before physical cleanup. The memory
budget measures retained DataFrames, not total process or concurrent request memory.

Hosted Supabase login, browser visual QA, and a complete Playwright flow have not
been verified in this stage. No database migration is required. Durable dataset
restoration remains Stage 14; navigating away or refreshing requires another upload.
