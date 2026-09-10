import { z } from "zod";

export const chartDataSchema = z.object({
  recommendation_index: z.number().int().min(0).max(5),
  data: z
    .array(z.object({ x: z.union([z.string(), z.number().finite()]), y: z.number().finite() }))
    .max(500),
  note: z.string(),
  error: z.string().nullable(),
});
export type ChartData = z.infer<typeof chartDataSchema>;
