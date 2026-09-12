# Stage 13 design: temporary full-data filtering

The browser has only a 100-row preview and aggregated charts. Filtering those
values would produce incorrect results, while uploading the CSV for every change
would violate the full-data processing boundary. Before implementation, this stage
chooses a bounded in-memory analytics cache as temporary processing state.

Cache entries expire after 15 minutes, have a combined 128 MiB DataFrame budget,
and are capped at eight entries. Tokens are unguessable and bound to a user/project
scope supplied only by the authenticated Next.js server. Every filter request
revalidates Supabase identity and project ownership. Expired or evicted entries
require another upload. No datasets are persisted to disk or Supabase yet.

Filters are ANDed across columns and ORed within selected categories. Numeric and
date bounds are inclusive; missing or unparseable values are excluded when their
column is filtered. All charts, KPIs, insights, statistics, and the preview update
from one response. Original chart choices remain stable, including zero-result
states. An explicit Apply action prevents a request for every keystroke, and reset
restores the unfiltered result. The UI distinguishes draft from applied filters.

This MVP cache requires a single analytics worker (or sticky routing). Restarting
the process loses its entries. Stage 14 will provide durable storage; the cache is
not a substitute for that work. Cache capacity or expiry never bypasses ownership.
