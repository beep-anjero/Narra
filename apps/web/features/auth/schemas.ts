import { z } from "zod";

const email = z
  .string()
  .trim()
  .max(254, "Use an email address under 255 characters.")
  .pipe(z.email("Enter a valid email address."));
const password = z
  .string()
  .min(1, "Enter your password.")
  .max(128, "Use a password of at most 128 characters.");

export const loginSchema = z.object({ email, password });
export const registrationSchema = z
  .object({
    email,
    password: password.min(8, "Use at least 8 characters for your password."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: { email?: string[]; password?: string[]; confirmPassword?: string[] };
};

export const initialAuthState: AuthFormState = { status: "idle" };
