// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn(), config: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: mocks.config }));
vi.mock("next/navigation", () => ({
  redirect: (path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { requireUser } from "@/features/auth/session";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
  });
  mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
});

describe("protected server component guard", () => {
  it("requires a provider-confirmed user even without the proxy", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
    mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
    expect(await requireUser()).toEqual({ id: "verified-user" });
  });
  it("rejects a stale or revoked user despite an embedded user object", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "revoked-user" } },
      error: new Error("revoked"),
    });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
  it("fails closed on missing configuration and provider failure", async () => {
    mocks.config.mockReturnValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
    expect(mocks.createClient).not.toHaveBeenCalled();
    mocks.config.mockReturnValue({});
    mocks.getUser.mockRejectedValue(new Error("network unavailable"));
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
});
