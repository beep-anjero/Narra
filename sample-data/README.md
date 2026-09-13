# Synthetic sample datasets

These five datasets are fictional and contain no real customer, student, or
campaign records. Each has 240 data rows. They are reproducible using seed 42:

```sh
uv run --directory apps/analytics --locked python scripts/build_demo.py
pnpm exec prettier --write apps/web/features/demo/generated
```

The script also generates bounded dashboard snapshots using Narra's production
parser, schema inference, statistics, recommendation, chart, and insight services.
Snapshots make the public demo initially available without a running analytics
service. Applying filters uses FastAPI and the exact same CSV files. Changing a
sample or analytics algorithm requires regenerating the snapshots.

- Ecommerce: dates, categories, regions, numeric metrics, and intentional missing revenue.
- Students: synthetic IDs, subjects, study hours, scores, and attendance.
- Marketing: dates, channels, spend, conversions, and revenue.
- Traffic: dates, sources, visitors, page views, and bounce rates.
- Weather: dates, cities, temperatures, rainfall, and humidity.
