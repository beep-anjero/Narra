// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  filter: vi.fn(),
  restore: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: m.client }));
vi.mock("@/lib/api/analytics", () => ({ filterDataset: m.filter }));
import { POST } from "@/app/api/projects/[id]/dataset/filter/route";
const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };
const body = JSON.stringify({ token: "a".repeat(43), filters: [] });
function request(content = body, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000/api/projects/${id}/dataset/filter`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "X-Narra-User": "attacker" },
    body: content,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  m.client.mockResolvedValue({ ...m, auth: { getUser: m.user } });
  for (const method of [m.from, m.select, m.eq]) method.mockReturnValue(m);
  m.maybeSingle.mockResolvedValue({ data: { id }, error: null });
  m.filter.mockResolvedValue({});
});
it("rejects foreign origin before authorization", async () => {
  expect((await POST(request(body, "https://evil.example"), context)).status).toBe(403);
  expect(m.user).not.toHaveBeenCalled();
});
it("rejects missing identity and another owner's project", async () => {
  m.user.mockResolvedValueOnce({ data: { user: null }, error: null });
  expect((await POST(request(), context)).status).toBe(401);
  m.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await POST(request(), context)).status).toBe(404);
  expect(m.filter).not.toHaveBeenCalled();
});
it("uses verified scope rather than client headers", async () => {
  const result = await POST(request(), context);
  expect(result.status).toBe(200);
  expect(m.filter).toHaveBeenCalledWith(JSON.parse(body), { userId: "owner", projectId: id });
  expect(result.headers.get("cache-control")).toBe("no-store");
});
it("rejects oversized or malformed filters", async () => {
  expect((await POST(request("x".repeat(65537)), context)).status).toBe(413);
  expect((await POST(request("bad"), context)).status).toBe(422);
  expect(m.filter).not.toHaveBeenCalled();
});
vi.mock("@/lib/api/saved-datasets", () => ({ restoreDataset: m.restore }));
it("rehydrates a saved dataset without making the browser upload again", async () => {
  m.restore.mockResolvedValue({ preview: { row_count: 10 } });
  const result = await POST(request(JSON.stringify({ token: null, filters: [] })), context);
  expect(result.status).toBe(200);
  expect(m.restore).toHaveBeenCalledWith({ userId: "owner", projectId: id });
  expect(m.filter).not.toHaveBeenCalled();
});
