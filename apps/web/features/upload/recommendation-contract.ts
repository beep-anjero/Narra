import { z } from "zod";

export const recommendationSchema = z.object({
  chart_type: z.enum(["line", "bar", "scatter", "histogram", "donut"]),
  title: z.string().min(1),
  x_column: z.string(),
  y_column: z.string().nullable(),
  aggregation: z.enum(["sum", "mean", "count", "none"]),
  reason: z.string().min(1),
  score: z.number().min(0).max(1),
  valid_rows: z.number().int().nonnegative(),
});
export type VisualizationRecommendation = z.infer<typeof recommendationSchema>;
