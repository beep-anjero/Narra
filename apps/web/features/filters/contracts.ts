import { z } from "zod";

export const filterFieldSchema = z.object({
  column: z.string(),
  kind: z.enum(["categorical", "numeric", "datetime"]),
  values: z.array(z.string()).max(50),
});
export const filterContextSchema = z.object({
  token: z.string().min(40).max(64),
  expires_in_seconds: z.number().int().positive(),
  fields: z.array(filterFieldSchema).max(200),
});
const ruleSchema = z.discriminatedUnion("kind", [
  z.object({
    column: z.string().max(200),
    kind: z.literal("categorical"),
    values: z.array(z.string()).min(1).max(50),
  }),
  z.object({
    column: z.string().max(200),
    kind: z.literal("numeric"),
    minimum: z.number().finite().nullable().optional(),
    maximum: z.number().finite().nullable().optional(),
  }),
  z.object({
    column: z.string().max(200),
    kind: z.literal("datetime"),
    start: z.iso.date().nullable().optional(),
    end: z.iso.date().nullable().optional(),
  }),
]);
export const filterRequestSchema = z
  .object({ token: z.string().min(40).max(64), filters: z.array(ruleSchema).max(20) })
  .refine(
    ({ filters }) =>
      filters.every(
        (rule) =>
          rule.kind === "categorical" ||
          (rule.kind === "numeric"
            ? (rule.minimum != null || rule.maximum != null) &&
              (rule.minimum == null || rule.maximum == null || rule.minimum <= rule.maximum)
            : (!!rule.start || !!rule.end) && (!rule.start || !rule.end || rule.start <= rule.end)),
      ),
    "Enter valid ranges with the lower bound before the upper bound.",
  );
export type FilterContext = z.infer<typeof filterContextSchema>;
export type FilterRequest = z.infer<typeof filterRequestSchema>;
