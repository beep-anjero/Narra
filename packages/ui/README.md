# Shared UI

Reserved for UI components that need to be shared between applications. shadcn/ui
is configured in `apps/web/components.json`. Stage 2's Button, Card, Badge, Dialog,
and Sheet components live in `apps/web/components/ui`.

This directory intentionally has no package manifest, exports, or build pipeline
until there is actual shared code. Add an `@narra/ui` workspace package when needed.
