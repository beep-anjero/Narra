# Stage 8 verification

Verified locally on September 9, 2026.

## Delivered

- Independent full-dataset statistics service with shared schema conversion rules.
- Numeric count, missing/invalid counts, mean, median, sample standard deviation,
  minimum, maximum, Q1, and Q3.
- Categorical frequencies, stable ties, and bounded top-category lists.
- UTC datetime bounds, elapsed days, and valid/invalid record counts.
- Dataset dimensions, missing-cell percentage, complete rows, and counts by type.
- Authenticated statistics endpoint and statistics included in the existing
  analysis response, with a validated TypeScript/Zod contract.

No new dependencies, environment variables, migrations, or UI panel are required.
Statistics are temporary; persistence is still scheduled for Stage 14.

## Verification

- `pnpm analytics:check`: Ruff lint/format checks and all 90 pytest tests passed.
- `pnpm check`: formatting, ESLint, TypeScript, all 114 frontend tests, and the
  Next.js production build passed.
- `git diff --check`: passed.
- Live Uvicorn HTTP smoke test: a 102-row CSV returned a 100-row preview with
  statistics calculated from all 102 rows. Numeric maximum, category frequency,
  date range, and missing summary matched expected values. The dedicated endpoint
  matched the combined analysis response, both used `no-store`, and missing
  authentication returned 401. The temporary process used a test-only credential.

Regression tests cover empty datasets, blank columns, single-value and constant
numeric columns, invalid values distinct from blanks, timezone/subsecond dates,
stable frequency ties, bounded frequencies, complete-row counts, input preservation,
integer limits, large dynamic ranges, JSON-safe overflow, and data beyond the
preview limit. An initially failing empty-frame missing-value calculation was
fixed and verified by the passing regression test.

## Deliberate boundaries

The web contract retains statistics but accepts omission during rolling deployment
with a Stage 7 analytics service. The statistics panel and paginated preview are
Stage 9 work. Period-based chart aggregations, recommendations, and insights remain
later stages. This stage did not verify hosted Supabase or a signed-in browser
workflow; automated route ownership/authentication tests remain in place.

Numeric calculations use float64 precision. Undefined or unrepresentable results
are null. Unique counts and categorical labels refer to original non-missing
strings, while numeric/date `count` includes only values that parse successfully.
