import { expect, it } from "vitest";
import { analysisSchema } from "@/features/upload/contracts";

const recommendation = {
  chart_type: "histogram",
  title: "Distribution of Score",
  x_column: "Score",
  y_column: null,
  aggregation: "count",
  reason: "A numeric distribution.",
  score: 0.8,
  valid_rows: 2,
};
const analysis = {
  preview: {
    filename: "scores.csv",
    file_size: 12,
    row_count: 2,
    column_count: 1,
    columns: ["Score"],
    rows: [["1"], ["2"]],
    preview_limit: 100,
    truncated: false,
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
  recommendations: [recommendation],
};

it("retains typed recommendations in the existing analysis response", () => {
  expect(analysisSchema.parse(analysis).recommendations).toEqual([recommendation]);
});
it.each([
  { score: 1.1 },
  { valid_rows: 3 },
  { chart_type: "pie" },
  { x_column: "Unknown" },
  { y_column: "Score" },
  { aggregation: "sum" },
  { chart_type: "donut" },
])("rejects invalid recommendation fields or incompatible axes: %j", (change) => {
  expect(
    analysisSchema.safeParse({ ...analysis, recommendations: [{ ...recommendation, ...change }] })
      .success,
  ).toBe(false);
});
it("accepts no suitable charts and rejects more than six", () => {
  expect(analysisSchema.safeParse({ ...analysis, recommendations: [] }).success).toBe(true);
  expect(
    analysisSchema.safeParse({ ...analysis, recommendations: Array(7).fill(recommendation) })
      .success,
  ).toBe(false);
});
