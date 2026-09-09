import { z } from "zod";

const count = z.number().int().nonnegative();
const metric = z.number().finite().nullable();
const common = {
  name: z.string(),
  count,
  missing: count,
  missing_percentage: z.number().min(0).max(100),
  unique_count: count,
};
const numeric = z.object({
  ...common,
  detected_type: z.literal("numeric"),
  invalid_count: count,
  mean: metric,
  median: metric,
  standard_deviation: z.number().finite().nonnegative().nullable(),
  minimum: metric,
  maximum: metric,
  q1: metric,
  q3: metric,
});
const categorical = z.object({
  ...common,
  detected_type: z.enum(["categorical", "boolean", "text"]),
  top_value: z.string().nullable(),
  top_value_count: count,
  top_categories: z.array(z.object({ value: z.string(), count: count.min(1) })).max(10),
});
const datetime = z.object({
  ...common,
  detected_type: z.literal("datetime"),
  invalid_count: count,
  earliest: z.iso.datetime({ offset: true }).nullable(),
  latest: z.iso.datetime({ offset: true }).nullable(),
  range_days: z.number().finite().nonnegative().nullable(),
});

export const statisticsSchema = z.object({
  summary: z.object({
    row_count: count,
    column_count: count.max(200),
    total_cells: count,
    missing_cells: count,
    missing_percentage: z.number().min(0).max(100),
    complete_rows: count,
    numeric_columns: count,
    categorical_columns: count,
    datetime_columns: count,
    boolean_columns: count,
    text_columns: count,
  }),
  columns: z
    .array(z.discriminatedUnion("detected_type", [numeric, categorical, datetime]))
    .max(200),
});
export type DatasetStatistics = z.infer<typeof statisticsSchema>;
