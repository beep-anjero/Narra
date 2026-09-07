"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authErrorMessage } from "@/features/auth/errors";
import { safeAuthDestination } from "@/features/auth/redirects";
import { loginSchema, registrationSchema, type AuthFormState } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function login(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    const supabase = await createSupabaseServerClient(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { status: "error", message: authErrorMessage(error) };
  } catch (error) {
    return { status: "error", message: authErrorMessage(error) };
  }
  revalidatePath("/", "layout");
  redirect(safeAuthDestination(formData.get("next")));
}

export async function register(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registrationSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };

  try {
    const supabase = await createSupabaseServerClient(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) return { status: "error", message: authErrorMessage(error) };
    if (!data.session) {
      // Supabase intentionally does not reveal whether a confirmed address already exists.
      return {
        status: "success",
        message:
          "Check your inbox for a confirmation link. If this email already has an account, you can log in instead.",
      };
    }
  } catch (error) {
    return { status: "error", message: authErrorMessage(error) };
  }
  revalidatePath("/", "layout");
  redirect(safeAuthDestination(formData.get("next")));
}

export async function logout(): Promise<void> {
  let failed = false;
  try {
    const supabase = await createSupabaseServerClient(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) redirect("/dashboard?notice=logout_failed");
  revalidatePath("/", "layout");
  redirect("/login?notice=signed_out");
}
