// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  analyze: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: m.client }));
vi.mock("@/lib/api/analytics", () => ({ analyzeDataset: m.analyze, uploadLimit: () => 100 }));
import { POST } from "@/app/api/projects/[id]/dataset/preview/route";
const id = "11111111-1111-4111-8111-111111111111";
function request(body = "A,B\n1,2", headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000/api/projects/${id}/dataset/preview`, {
    method: "POST",
    body,
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "text/csv",
      "X-Filename": "data.csv",
      ...headers,
    },
  });
}
const context = { params: Promise.resolve({ id }) };
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  m.client.mockResolvedValue({ ...m, auth: { getUser: m.user } });
  for (const method of [m.from, m.select, m.eq]) method.mockReturnValue(m);
  m.maybeSingle.mockResolvedValue({ data: { id }, error: null });
  m.analyze.mockResolvedValue({ preview: { filename: "data.csv" }, column_metadata: [] });
});
it("rejects cross-origin uploads before reading identity or body", async () => {
  expect((await POST(request("A", { Origin: "https://evil.example" }), context)).status).toBe(403);
  expect(m.user).not.toHaveBeenCalled();
  expect(m.analyze).not.toHaveBeenCalled();
});
it("requires an authenticated session", async () => {
  m.user.mockResolvedValue({ data: { user: null }, error: null });
  expect((await POST(request(), context)).status).toBe(401);
  expect(m.from).not.toHaveBeenCalled();
});
it("denies another user's project without forwarding data", async () => {
  m.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await POST(request(), context)).status).toBe(404);
  expect(m.eq).toHaveBeenCalledWith("user_id", "owner");
  expect(m.eq).toHaveBeenCalledWith("id", id);
  expect(m.analyze).not.toHaveBeenCalled();
});
it("reports database failure", async () => {
  m.maybeSingle.mockResolvedValue({ data: null, error: {} });
  expect((await POST(request(), context)).status).toBe(503);
});
it("enforces actual byte limits without a content-length", async () => {
  expect((await POST(request("A".repeat(101)), context)).status).toBe(413);
  expect(m.analyze).not.toHaveBeenCalled();
});
it.each([
  ["", 422],
  ["A,B\n1,2", 415],
])("rejects empty or unsupported input", async (body, status) => {
  expect(
    (await POST(request(body, status === 415 ? { "X-Filename": "data.xlsx" } : {}), context))
      .status,
  ).toBe(status);
  expect(m.analyze).not.toHaveBeenCalled();
});
it("forwards original bytes after ownership checks and never caches", async () => {
  const result = await POST(request(), context);
  expect(result.status).toBe(200);
  expect(m.client).toHaveBeenCalledWith(true);
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect(new TextDecoder().decode(m.analyze.mock.calls[0]?.[0] as ArrayBuffer)).toBe("A,B\n1,2");
});
