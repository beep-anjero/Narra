# Stage 15: reproducible demo

`/demo` opens a read-only sample analysis without authentication. Five allowlisted,
synthetic CSVs contain 240 rows each and are downloadable. The generator runs the
same production services as uploads and writes validated, bounded JSON snapshots.
Initial rendering therefore needs neither Supabase nor a live analytics process.
Filters use the running FastAPI service and ignore caller-supplied cache tokens;
only server-selected public sample scopes can be processed through the demo API.

No private project or arbitrary upload is reachable through demo routes. Failed
filter requests retain the original dashboard. Demo state is not saved to an
account. Use New Analysis and upload a downloaded sample to save a private copy.

Regeneration and provenance are documented in [sample data](../sample-data/README.md).
The production process must include the root `sample-data` directory; deployment
configuration is completed in Stage 17.

Validation passed: 165 Vitest tests, 134 pytest tests, ESLint, Ruff, TypeScript,
and the Next.js production build. Browser interaction and mobile checks follow in
Stage 16. The public demo snapshots validate against the full web response schema.
