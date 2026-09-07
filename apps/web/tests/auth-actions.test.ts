// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { login, logout, register } from "@/features/auth/actions";
import { initialAuthState } from "@/features/auth/schemas";

function credentials(extra: Record<string, string> = {}) {
  const form = new FormData();
  Object.entries({
    email: "person@example.com",
    password: "  good passphrase  ",
    confirmPassword: "  good passphrase  ",
    ...extra,
  }).forEach(([key, value]) => form.set(key, value));
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createClient.mockResolvedValue({ auth: mocks });
  mocks.redirect.mockImplementation((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  });
});

describe("auth server actions", () => {
  it("rejects invalid fields before contacting the provider and never returns credentials", async () => {
    const result = await register(
      initialAuthState,
      credentials({ confirmPassword: "not the same" }),
    );
    expect(result.status).toBe("error");
    expect(result.fieldErrors?.confirmPassword).toBeDefined();
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("good passphrase");
  });
  it("logs in with exact credentials, writes cookies, and sanitizes external next values", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    await expect(login(initialAuthState, credentials({ next: "//evil.example" }))).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
    expect(mocks.createClient).toHaveBeenCalledWith(true);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "  good passphrase  ",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it("shows actionable invalid-credential errors without redirecting", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    const result = await login(initialAuthState, credentials());
    expect(result.message).toContain("email or password is incorrect");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("waits for confirmation when registration produces no session", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect((await register(initialAuthState, credentials())).status).toBe("success");
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.signUp.mock.calls[0]?.[0]).not.toHaveProperty("confirmPassword");
  });
  it("redirects a confirmed registration to the requested internal destination", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: "test" } }, error: null });
    await expect(register(initialAuthState, credentials({ next: "/project/123" }))).rejects.toThrow(
      "REDIRECT:/project/123",
    );
  });
  it("handles unavailable provider without leaking internal errors", async () => {
    mocks.createClient.mockRejectedValue(new Error("private server details"));
    const result = await login(initialAuthState, credentials());
    expect(result.status).toBe("error");
    expect(result.message).toContain("account service");
    expect(result.message).not.toContain("private");
  });
  it("logs out only the current browser and invalidates the router cache", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await expect(logout()).rejects.toThrow("REDIRECT:/login?notice=signed_out");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it("does not claim successful logout if session revocation fails", async () => {
    mocks.signOut.mockResolvedValue({ error: { code: "unexpected_failure" } });
    await expect(logout()).rejects.toThrow("REDIRECT:/dashboard?notice=logout_failed");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
