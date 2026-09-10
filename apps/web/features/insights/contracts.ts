import { z } from "zod";

export const insightSchema = z.object({
  type: z.enum([
    "missing_data",
    "outlier",
    "correlation",
    "top_category",
    "bottom_category",
    "trend",
  ]),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["info", "warning"]),
  columns: z.array(z.string()).min(1).max(2),
  metadata: z.record(z.string(), z.union([z.string(), z.number().finite(), z.null()])),
});
export type Insight = z.infer<typeof insightSchema>;
