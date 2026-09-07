// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createServerClient: vi.fn(), getClaims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));

import { updateSession } from "@/lib/supabase/proxy";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  mocks.createServerClient.mockReturnValue({ auth: { getClaims: mocks.getClaims } });
  mocks.getClaims.mockResolvedValue({ data: null, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("server route protection", () => {
  it.each(["/dashboard", "/dashboard/new", "/project/123/data", "/project/123/settings"])(
    "redirects anonymous access to %s",
    async (path) => {
      const response = await updateSession(new NextRequest(`http://localhost:3000${path}`));
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe(path);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it("rejects invalid claims despite a supplied session cookie", async () => {
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: "forged" } },
      error: new Error("bad signature"),
    });
    const response = await updateSession(
      new NextRequest("http://localhost:3000/dashboard", {
        headers: { cookie: "sb-test-auth-token=forged" },
      }),
    );
    expect(response.status).toBe(307);
  });
  it("passes validated requests and propagates refreshed cookies in both directions", async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([
        { name: "sb-test-auth-token", value: "refreshed", options: { path: "/", sameSite: "lax" } },
      ]);
      return { auth: { getClaims: mocks.getClaims } };
    });
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "valid-user" } }, error: null });
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await updateSession(request);
    expect(response.headers.get("location")).toBeNull();
    expect(request.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
  });
  it("keeps cookie deletions on a login redirect", async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([
        { name: "sb-test-auth-token", value: "", options: { path: "/", maxAge: 0 } },
      ]);
      return { auth: { getClaims: mocks.getClaims } };
    });
    const response = await updateSession(new NextRequest("http://localhost:3000/dashboard"));
    expect(response.cookies.get("sb-test-auth-token")?.maxAge).toBe(0);
  });
  it("fails closed when configuration or the provider is unavailable, without blocking login", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect((await updateSession(new NextRequest("http://localhost:3000/dashboard"))).status).toBe(
      307,
    );
    expect((await updateSession(new NextRequest("http://localhost:3000/login"))).status).toBe(200);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    mocks.getClaims.mockRejectedValue(new Error("offline"));
    expect((await updateSession(new NextRequest("http://localhost:3000/project/123"))).status).toBe(
      307,
    );
  });
});
