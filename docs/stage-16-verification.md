# Stage 16: browser testing and polish

Eight Playwright tests passed across desktop Chromium and Pixel 7 mobile emulation.
They cover landing-to-demo navigation, exact full-data filter results, zero matches,
reset, CSV download, network-error retention, sample switching, private-route
redirects, and account form validation. The tested demo has no axe WCAG A/AA
violations and no horizontal page overflow at either viewport. Screenshots were
visually inspected. These audits are not a substitute for all assistive-device testing.

The first browser run found a valid-origin rejection caused by Next.js's internal
hostname. Both private and demo APIs now compare Origin to HTTP Host, preserve
cross-origin rejection, and ignore untrusted forwarded-host values. Regression
tests cover this distinction. Reverse proxies must preserve and validate Host.
Another initial failure was a test selector matching Next's hidden route announcer;
selectors now target actual form/filter errors. All eight tests passed after fixes.

Twenty targeted Vitest regression tests, lint, strict TypeScript, and the production
build passed. The preceding full suite passed 165 tests; two origin tests were
added. CI now runs both apps' checks and the public browser suite.

Uploads invalidate saved project routes and refresh the client router. Processing
feedback describes the pipeline without claiming unreported stages are complete.
Copy and error messages now describe saved datasets and the current release.

The separately selected signed-in lifecycle test includes optional registration,
login, upload, filtering, logout/relogin, saved restoration, preview, and deletion.
It is **not run here**: the hosted dataset migration and disposable confirmed test
credentials are missing. It fails explicitly without credentials. See
[testing](testing.md) for setup; do not count this as a verified hosted lifecycle.
