import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/features/auth/auth-form";
import { authNotice } from "@/features/auth/notices";
import { safeAuthDestination } from "@/features/auth/redirects";
import { getCurrentUser } from "@/features/auth/session";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const next = safeAuthDestination(parameters.next);
  if (await getCurrentUser()) redirect(next);
  const notice = authNotice(parameters.notice);
  return (
    <>
      <p className="mb-4 text-xs font-semibold tracking-widest text-primary uppercase">
        Welcome back
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Log in to Narra</h1>
      <p className="mt-4 mb-8 text-base leading-relaxed text-muted-foreground">
        Your workspace is right where you left it.
      </p>
      {notice && (
        <p role="status" className="mb-6 rounded-lg border bg-white p-4 text-sm leading-relaxed">
          {notice}
        </p>
      )}
      <AuthForm mode="login" next={next} enabled={Boolean(getSupabaseConfig())} />
    </>
  );
}
