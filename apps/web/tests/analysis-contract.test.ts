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
