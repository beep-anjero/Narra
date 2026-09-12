import { expect, it } from "vitest";
import { filterRequestSchema } from "@/features/filters/contracts";
import { analysisSchema } from "@/features/upload/contracts";
import { createDashboardStore } from "@/stores/dashboard-store";

it("validates calendar and numeric ranges", () => {
  const token = "t".repeat(43);
  expect(
    filterRequestSchema.safeParse({
      token,
      filters: [{ kind: "numeric", column: "N", minimum: 5, maximum: 1 }],
    }).success,
  ).toBe(false);
  expect(
    filterRequestSchema.safeParse({
      token,
      filters: [{ kind: "datetime", column: "D", start: "2026-02-30" }],
    }).success,
  ).toBe(false);
  expect(
    filterRequestSchema.safeParse({
      token,
      filters: [{ kind: "numeric", column: "N", minimum: 0 }],
    }).success,
  ).toBe(true);
});

it("accepts a zero-match response with the original chart choices", () => {
  const result = {
    preview: {
      filename: "data.csv",
      file_size: 20,
      row_count: 0,
      column_count: 1,
      columns: ["Region"],
      rows: [],
      preview_limit: 100,
      truncated: false,
    },
    column_metadata: [
      {
        name: "Region",
        detected_type: "categorical",
        missing_count: 0,
        missing_percentage: 0,
        unique_count: 0,
        sample_values: [],
      },
    ],
    recommendations: [
      {
        chart_type: "donut",
        title: "Regions",
        x_column: "Region",
        y_column: null,
        aggregation: "count",
        reason: "Original choice",
        score: 0.8,
        valid_rows: 0,
      },
    ],
    charts: [{ recommendation_index: 0, data: [], error: null, note: "No rows" }],
  };
  expect(analysisSchema.safeParse(result).success).toBe(true);
  expect(
    analysisSchema.safeParse({ ...result, preview: { ...result.preview, row_count: 5 } }).success,
  ).toBe(false);
});

it("does not share filter state across dataset stores", () => {
  const first = createDashboardStore();
  const second = createDashboardStore();
  first.getState().addColumn("Revenue");
  first.getState().edit("Revenue", { minimum: "5" });
  expect(second.getState().selectedColumns).toEqual([]);
  expect(second.getState().draft).toEqual({});
});
