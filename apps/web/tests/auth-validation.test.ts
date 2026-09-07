// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { authErrorMessage } from "@/features/auth/errors";
import { safeAuthDestination } from "@/features/auth/redirects";
import { loginSchema, registrationSchema } from "@/features/auth/schemas";
import { getSupabaseConfig } from "@/lib/supabase/config";

afterEach(() => vi.unstubAllEnvs());

describe("auth input boundaries", () => {
  it("normalizes email whitespace while preserving password spaces", () => {
    expect(
      loginSchema.parse({ email: " person@example.com ", password: " a passphrase " }),
    ).toEqual({ email: "person@example.com", password: " a passphrase " });
  });
  it("rejects invalid email, missing fields, and excessive input", () => {
    expect(loginSchema.safeParse({ email: "wrong", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: null, password: null }).success).toBe(false);
    expect(
      loginSchema.safeParse({ email: "person@example.com", password: "x".repeat(129) }).success,
    ).toBe(false);
  });
  it("enforces signup strength and confirmation without imposing signup rules on login", () => {
    expect(loginSchema.safeParse({ email: "p@example.com", password: "legacy" }).success).toBe(
      true,
    );
    expect(
      registrationSchema.safeParse({
        email: "p@example.com",
        password: "legacy",
        confirmPassword: "legacy",
      }).success,
    ).toBe(false);
    const mismatch = registrationSchema.safeParse({
      email: "p@example.com",
      password: "long passphrase",
      confirmPassword: "different phrase",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) expect(mismatch.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5cevil.example",
    "/auth/confirm",
    "/dashboard/../../login",
    "javascript:alert(1)",
    ["/project/one"],
    undefined,
  ])("rejects unsafe return destination %j", (value) => {
    expect(safeAuthDestination(value)).toBe("/dashboard");
  });
  it("preserves an internal project path and query", () => {
    expect(safeAuthDestination("/project/123/data?page=2")).toBe("/project/123/data?page=2");
  });
  it("maps known auth errors without exposing raw provider messages", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toContain(
      "email or password is incorrect",
    );
    expect(authErrorMessage({ code: "email_not_confirmed" })).toContain("Confirm your email");
    expect(authErrorMessage({ code: "over_request_rate_limit" })).toContain("Too many attempts");
    expect(authErrorMessage(new Error("sensitive provider details"))).not.toContain("sensitive");
  });
});

describe("public Supabase configuration", () => {
  it("fails closed when absent or configured with a private key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(getSupabaseConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_do_not_use");
    expect(getSupabaseConfig()).toBeNull();
    const adminPayload = Buffer.from(JSON.stringify({ role: "service_role" })).toString(
      "base64url",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", `header.${adminPayload}.signature`);
    expect(getSupabaseConfig()).toBeNull();
  });
  it("accepts a public key and rejects non-HTTP URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(getSupabaseConfig()).not.toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "file:///tmp/database");
    expect(getSupabaseConfig()).toBeNull();
  });
});
