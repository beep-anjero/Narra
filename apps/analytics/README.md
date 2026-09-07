# Analytics service

Reserved for the FastAPI service, initialized in Stage 5. There is no runnable
Python application or dependency environment in Stage 1.

Planned responsibilities: CSV parsing, schema inference, statistics, missing-value
analysis, chart recommendations, correlations, outliers, and deterministic insights.

`app/api` will hold thin versioned HTTP handlers. Analytics logic belongs in
`app/services`, request/response contracts in `app/schemas`, internal models in
`app/models`, and focused helpers in `app/utils`. Tests belong in `tests`.

Persistence remains outside the analytics service. MVP processing will not use an LLM.
