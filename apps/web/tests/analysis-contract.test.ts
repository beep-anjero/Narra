import { expect, it } from "vitest";
import { analysisSchema } from "@/features/upload/contracts";

const valid = {
  preview: {
    filename: "data.csv",
    file_size: 20,
    row_count: 2,
    column_count: 1,
    columns: ["Score"],
    rows: [["12"], [""]],
    preview_limit: 100,
    truncated: false,
  },
  column_metadata: [
    {
      name: "Score",
      detected_type: "numeric",
      missing_count: 1,
      missing_percentage: 50,
      unique_count: 1,
      sample_values: ["12"],
    },
  ],
};

const statistics = {
  summary: {
    row_count: 2,
    column_count: 1,
    total_cells: 2,
    missing_cells: 1,
    missing_percentage: 50,
    complete_rows: 1,
    numeric_columns: 1,
    categorical_columns: 0,
    datetime_columns: 0,
    boolean_columns: 0,
    text_columns: 0,
  },
  columns: [
    {
      name: "Score",
      detected_type: "numeric",
      count: 1,
      missing: 1,
      missing_percentage: 50,
      unique_count: 1,
      invalid_count: 0,
      mean: 12,
      median: 12,
      standard_deviation: null,
      minimum: 12,
      maximum: 12,
      q1: 12,
      q3: 12,
    },
  ],
};

it("retains validated statistics without requiring a second upload", () => {
  expect(analysisSchema.parse({ ...valid, statistics }).statistics).toEqual(statistics);
});

it.each([
  { mean: Infinity },
  { standard_deviation: -1 },
  { count: 2 },
  { missing: 0 },
  { invalid_count: 1 },
  { name: "Wrong" },
])("rejects invalid statistics: %j", (change) => {
  expect(
    analysisSchema.safeParse({
      ...valid,
      statistics: { ...statistics, columns: [{ ...statistics.columns[0], ...change }] },
    }).success,
  ).toBe(false);
});

it("rejects summary dimensions inconsistent with the CSV", () => {
  expect(
    analysisSchema.safeParse({
      ...valid,
      statistics: { ...statistics, summary: { ...statistics.summary, total_cells: 999 } },
    }).success,
  ).toBe(false);
});

it("accepts consistent schema metadata and preview", () => {
  expect(analysisSchema.safeParse(valid).success).toBe(true);
});

it.each([
  { name: "Different column" },
  { detected_type: "unknown" },
  { missing_count: 3 },
  { unique_count: 2 },
  { missing_percentage: 101 },
  { sample_values: Array(6).fill("12") },
])("rejects incompatible schema metadata: %j", (change) => {
  expect(
    analysisSchema.safeParse({
      ...valid,
      column_metadata: [{ ...valid.column_metadata[0], ...change }],
    }).success,
  ).toBe(false);
});

it("rejects missing column metadata", () => {
  expect(analysisSchema.safeParse({ ...valid, column_metadata: [] }).success).toBe(false);
});
