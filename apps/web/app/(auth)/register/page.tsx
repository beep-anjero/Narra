import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/features/auth/auth-form";
import { safeAuthDestination } from "@/features/auth/redirects";
import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const next = safeAuthDestination(parameters.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <>
      <p className="mb-4 text-xs font-semibold tracking-widest text-primary uppercase">
        Make room for discovery
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create your account</h1>
      <p className="mt-4 mb-8 text-base leading-relaxed text-muted-foreground">
        Start with a workspace of your own. Save your projects and prepare for CSV analysis.
      </p>
      <AuthForm mode="register" next={next} enabled={Boolean(getSupabaseConfig())} />
    </>
  );
}
