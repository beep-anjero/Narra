// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn(), createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

import { GET } from "@/app/auth/confirm/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createClient.mockResolvedValue({ auth: { verifyOtp: mocks.verifyOtp } });
});

describe("email confirmation", () => {
  it.each(["", "?type=email", "?token_hash=token&type=recovery"])(
    "rejects missing or unsupported confirmation input: %s",
    async (query) => {
      const response = await GET(new NextRequest(`http://localhost:3000/auth/confirm${query}`));
      expect(response.headers.get("location")).toBe(
        "http://localhost:3000/login?notice=confirmation_failed",
      );
      expect(mocks.createClient).not.toHaveBeenCalled();
    },
  );
  it("verifies the token server-side and prevents external redirects", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null });
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?type=email&token_hash=token&next=https://evil.example",
      ),
    );
    expect(mocks.createClient).toHaveBeenCalledWith(true);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "token" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("handles expired and already-used links without exposing tokens in the redirect", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    const response = await GET(
      new NextRequest("http://localhost:3000/auth/confirm?type=email&token_hash=private_token"),
    );
    expect(response.headers.get("location")).toContain("notice=confirmation_failed");
    expect(response.headers.get("location")).not.toContain("private_token");
  });
});
