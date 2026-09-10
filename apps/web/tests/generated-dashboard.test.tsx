import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { DatasetAnalysis } from "@/features/upload/contracts";
vi.mock("@/features/charts/chart-renderer", () => ({
  ChartRenderer: () => <div>Rendered chart</div>,
}));
import { GeneratedDashboard } from "@/features/dashboard/generated-dashboard";
const analysis: DatasetAnalysis = {
  preview: {
    filename: "scores.csv",
    file_size: 20,
    row_count: 120,
    column_count: 1,
    columns: ["Score"],
    rows: [["1"], ["2"]],
    preview_limit: 100,
    truncated: true,
  },
  column_metadata: [
    {
      name: "Score",
      detected_type: "numeric",
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 2,
      sample_values: ["1", "2"],
    },
  ],
  recommendations: [
    {
      chart_type: "histogram",
      title: "Distribution of Score",
      x_column: "Score",
      y_column: null,
      aggregation: "count",
      reason: "Numeric column",
      score: 0.8,
      valid_rows: 120,
    },
  ],
  charts: [
    {
      recommendation_index: 0,
      data: [{ x: "1–2", y: 120 }],
      note: "All valid values",
      error: null,
    },
  ],
};
it("renders generated charts and source totals rather than preview counts", () => {
  render(<GeneratedDashboard analysis={analysis} />);
  expect(screen.getByText("Records", { selector: "dt" }).nextElementSibling).toHaveTextContent(
    "120",
  );
  expect(screen.getByText("Rendered chart")).toBeInTheDocument();
  expect(screen.getByText("View chart data")).toBeInTheDocument();
});
it("handles no recommendations without fabricating charts", () => {
  render(<GeneratedDashboard analysis={{ ...analysis, recommendations: [], charts: [] }} />);
  expect(screen.getByText(/No suitable charts/)).toBeInTheDocument();
  expect(screen.queryByText("Rendered chart")).not.toBeInTheDocument();
});
it("shows per-chart numeric errors", () => {
  render(
    <GeneratedDashboard
      analysis={{
        ...analysis,
        charts: [
          {
            recommendation_index: 0,
            data: [],
            note: "",
            error: "Values exceed the numeric range.",
          },
        ],
      }}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("numeric range");
});
