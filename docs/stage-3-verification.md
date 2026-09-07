# Stage 3 verification

Implementation and local verification completed September 8, 2026, using Node.js
24.11.0 and pnpm 11.19.0. **Hosted Supabase setup and live auth verification remain
pending** because no Supabase project or credentials were supplied.

## Implemented

- Supabase SSR integration using the public project key and cookie-based sessions.
- Email/password login and registration with server-side Zod validation.
- Confirmation-email handling, useful error notices, and pending form states.
- Logout of the current browser session with router-cache invalidation.
- Proxy protection for `/dashboard` and every `/project/*` URL, plus an independent
  server-side `requireUser()` guard on the protected layout and workspace.
- A `profiles` migration, owner-only SELECT policy, restricted grants, Auth triggers,
  existing-user backfill, email synchronization, and cascade deletion.
- Login links and a registration destination for the marketing page's primary CTA.
- Setup instructions, including the required Supabase confirmation email template.

## Automated checks

| Check                                       | Result                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`            | Passed after pinning a Node-compatible jsdom release                         |
| Formatting, lint, and strict TypeScript     | Passed                                                                       |
| `pnpm test`                                 | 57 tests across eight files                                                  |
| `pnpm build`                                | Passed; marketing/icon static, auth/workspace routes dynamic, Proxy included |
| Profile SQL tests after final grants change | All ten passed                                                               |
| Production HTTP smoke checks                | Passed on port 3100; test server stopped afterward                           |

The test suite covers:

- Email/password boundaries, preserved password whitespace, confirmation mismatch,
  safe internal redirects, and rejection of secret/service-role configuration keys.
- Login, signup with/without email confirmation, provider failures, logout success
  and failure, and avoidance of password leakage into returned form state.
- Invalid session claims, missing service configuration, protected nested routes,
  refresh-cookie propagation, deletion cookies on redirects, and the independent
  server-component identity check.
- Valid, invalid, expired, or unsupported confirmation links and redirect safety.
- Disabled unconfigured forms, password visibility, pending-submit behavior,
  accessible field feedback, confirmation messaging, and mobile navigation.
- The unchanged production SQL migration running in embedded PostgreSQL: backfill,
  triggers, two-user isolation, absent identity, anonymous reads, denied writes,
  email synchronization, cascades, and restricted security-definer execution.

The two Stage 2 availability-dialog tests were removed because that CTA now opens
registration. The mobile navigation tests remain; the new auth-form tests cover
the replacement flow.

## HTTP checks

Against the production build with Supabase configuration absent:

- `/`, `/login`, and `/register` returned HTTP 200.
- Auth forms rendered the configuration availability message with submission disabled.
- `/dashboard`, `/dashboard/new`, `/project/123`, `/project/123/data`, and
  `/project/123/settings` returned HTTP 307 to login with the requested destination
  preserved and `Cache-Control: private, no-store`.
- An unsupported confirmation flow redirected to the confirmation-failure notice.

The smoke-check harness initially assumed an absolute redirect URL; it was corrected
to accept Next.js's valid same-origin relative Location headers. No app change was
needed for that check.

## Dependency compatibility

A fresh frozen-lockfile install exposed that jsdom 30.0.1 requires a newer Node
patch than the repository's pinned 24.11.0. It was changed to jsdom 27.3.0, whose
declared Node range includes this runtime. The install then passed without changing
the machine's Node version or disabling engine checks. Its transitive
`whatwg-encoding` deprecation notice and the existing ESLint 9 lifecycle notice do
not represent lint warnings; the lint command still permits zero warnings.

## Required live follow-up

No Supabase account, database, or email service was created or modified. Unit tests
use explicit provider mocks; SQL tests model only the Supabase-owned schema needed
to execute Narra's actual migration. Those tests are not a hosted integration test.

Follow `docs/supabase-setup.md` to connect a project, apply the migration, configure
confirmation links, then verify registration, email delivery, confirmation,
reload/persistence, logout, re-login, and two-user isolation against the Data API.
No live success, full browser accessibility conformance, or complete E2E flow is claimed.

Stage 4 project CRUD, project/dataset RLS, uploads, analytics, and deployment have
not been started.
