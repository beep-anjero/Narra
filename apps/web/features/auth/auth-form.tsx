"use client";

import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { login, register } from "@/features/auth/actions";
import { AuthField } from "@/features/auth/auth-field";
import { initialAuthState } from "@/features/auth/schemas";

export function AuthForm({
  mode,
  next,
  enabled,
}: {
  mode: "login" | "register";
  next: string;
  enabled: boolean;
}) {
  const isRegistration = mode === "register";
  const [state, action, pending] = useActionState(
    isRegistration ? register : login,
    initialAuthState,
  );
  const alternate = `${isRegistration ? "/login" : "/register"}?next=${encodeURIComponent(next)}`;

  if (state.status === "success")
    return (
      <div role="status" className="space-y-5 rounded-xl border border-primary/20 bg-secondary p-6">
        <CheckCircle2 aria-hidden="true" className="size-8 text-primary" />
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-base leading-relaxed">{state.message}</p>
        <Button asChild className="h-11">
          <Link href={alternate}>
            Back to login <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );

  return (
    <>
      {!enabled && (
        <p
          role="status"
          className="mb-6 rounded-lg border bg-secondary p-4 text-sm leading-relaxed"
        >
          Narra’s account service isn’t connected yet. Registration and login will be available once
          setup is complete.
        </p>
      )}
      <form action={action} noValidate aria-busy={pending}>
        <input type="hidden" name="next" value={next} />
        <fieldset disabled={!enabled || pending} className="space-y-5 disabled:opacity-60">
          <legend className="sr-only">
            {isRegistration ? "Registration details" : "Login details"}
          </legend>
          <AuthField
            name="email"
            label="Email address"
            autoComplete="email"
            errors={state.fieldErrors?.email}
          />
          <AuthField
            name="password"
            label="Password"
            autoComplete={isRegistration ? "new-password" : "current-password"}
            errors={state.fieldErrors?.password}
            hint={
              isRegistration
                ? "Use at least 8 characters. Spaces and passphrases are welcome."
                : undefined
            }
          />
          {isRegistration && (
            <AuthField
              name="confirmPassword"
              label="Confirm password"
              autoComplete="new-password"
              errors={state.fieldErrors?.confirmPassword}
            />
          )}
          {state.status === "error" && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            >
              {state.message ?? "Please check the highlighted fields."}
            </div>
          )}
          <Button type="submit" className="h-12 w-full text-base">
            {pending ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                {isRegistration ? "Creating your account…" : "Logging in…"}
              </>
            ) : (
              <>
                {isRegistration ? "Create account" : "Log in"}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </Button>
        </fieldset>
      </form>
      <p className="mt-7 text-center text-sm text-muted-foreground">
        {isRegistration ? "Already have an account?" : "New to Narra?"}{" "}
        <Link href={alternate} className="font-medium text-primary underline underline-offset-4">
          {isRegistration ? "Log in" : "Create an account"}
        </Link>
      </p>
    </>
  );
}
