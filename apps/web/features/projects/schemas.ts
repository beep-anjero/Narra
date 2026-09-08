import { z } from "zod";

export const projectIdSchema = z.uuid();
export const projectSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(100, "Use at most 100 characters."),
  description: z.string().trim().max(2000, "Use at most 2,000 characters."),
});
export type ProjectFormState = { message?: string; success?: boolean };
