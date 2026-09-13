"""Reproduce synthetic CSVs and real pipeline snapshots; no network or credentials."""

import csv
import json
import math
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.schemas.dataset import DatasetAnalysis  # noqa: E402
from app.services.chart_data import prepare_chart_data  # noqa: E402
from app.services.csv_parser import read_csv  # noqa: E402
from app.services.dashboard_filters import filter_fields  # noqa: E402
from app.services.insight_generator import generate_insights  # noqa: E402
from app.services.schema_detector import infer_schema  # noqa: E402
from app.services.statistics import calculate_statistics  # noqa: E402
from app.services.visualization_recommender import recommend_visualizations  # noqa: E402
from app.settings import Settings  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]


def build():
    rng = random.Random(42)
    samples = {
        "ecommerce-sales": [
            ["Date", "Category", "Region", "Revenue", "Units", "Advertising Spend"]
        ],
        "student-performance": [["Student ID", "Subject", "Study Hours", "Score", "Attendance"]],
        "marketing-campaign": [["Date", "Channel", "Spend", "Conversions", "Revenue"]],
        "website-traffic": [["Date", "Source", "Visitors", "Page Views", "Bounce Rate"]],
        "weather-history": [["Date", "City", "Temperature", "Rainfall", "Humidity"]],
    }
    for i in range(240):
        day = (date(2026, 1, 1) + timedelta(days=i // 2)).isoformat()
        spend = round(30 + i * 0.4 + rng.uniform(0, 30), 2)
        revenue = round(spend * 4 + rng.uniform(10, 130), 2)
        samples["ecommerce-sales"].append(
            [
                day,
                ["Electronics", "Home", "Clothing", "Books"][i % 4],
                ["North", "South", "East"][i % 3],
                revenue if i % 47 else "",
                rng.randint(1, 12),
                spend,
            ]
        )
        hours = round(rng.uniform(1, 10), 1)
        samples["student-performance"].append(
            [
                f"S{i + 1:04}",
                ["Math", "Science", "English"][i % 3],
                hours,
                min(100, round(40 + hours * 5 + rng.uniform(-8, 8), 1)),
                rng.randint(65, 100),
            ]
        )
        samples["marketing-campaign"].append(
            [
                day,
                ["Search", "Social", "Email", "Referral"][i % 4],
                spend,
                int(spend / 5 + rng.uniform(0, 6)),
                revenue,
            ]
        )
        visitors = rng.randint(100, 900) + i
        samples["website-traffic"].append(
            [
                day,
                ["Organic", "Direct", "Social"][i % 3],
                visitors,
                visitors * rng.randint(2, 4),
                round(rng.uniform(20, 70), 1),
            ]
        )
        samples["weather-history"].append(
            [
                day,
                ["Manila", "Cebu"][i % 2],
                round(27 + 3 * math.sin(i / 20) + rng.uniform(0, 3), 1),
                round(rng.uniform(0, 15), 1) if i % 4 == 0 else 0,
                rng.randint(55, 95),
            ]
        )
    settings = Settings(_env_file=None)
    for name, rows in samples.items():
        path = ROOT / "sample-data" / f"{name}.csv"
        path.parent.mkdir(exist_ok=True)
        with path.open("w", newline="", encoding="utf-8") as file:
            csv.writer(file, lineterminator="\n").writerows(rows)
        parsed = read_csv(path.read_bytes(), path.name, "text/csv", 20971520, 100000)
        columns = infer_schema(parsed.frame, settings)
        recommendations = recommend_visualizations(parsed.frame, columns)
        result = DatasetAnalysis(
            preview=parsed.preview,
            column_metadata=columns,
            statistics=calculate_statistics(parsed.frame, columns),
            recommendations=recommendations,
            charts=prepare_chart_data(parsed.frame, recommendations),
            insights=generate_insights(parsed.frame, columns),
        )
        payload = result.model_dump(mode="json")
        payload["filter_context"] = {
            "token": None,
            "expires_in_seconds": 900,
            "fields": [field.model_dump() for field in filter_fields(parsed.frame, result)],
        }
        target = ROOT / "apps/web/features/demo/generated" / f"{name}.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    build()
