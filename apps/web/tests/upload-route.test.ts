// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const m = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  analyze: vi.fn(),
  persist: vi.fn(),
}));
vi.mock("@/lib/api/saved-datasets", () => ({
  getSavedDataset: async () => null,
  signedDatasetUrl: async () => "https://project.supabase.co/storage/v1/object/sign/datasets/x",
  persistUploadedDataset: m.persist,
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: m.client }));
vi.mock("@/lib/api/analytics", () => ({ analyzeStoredDataset: m.analyze, uploadLimit: () => 100 }));
import { POST } from "@/app/api/projects/[id]/dataset/preview/route";
const id = "11111111-1111-4111-8111-111111111111";
const ticket = {
  id: "22222222-2222-4222-8222-222222222222",
  path: `owner/${id}/22222222-2222-4222-8222-222222222222.csv`,
  filename: "data.csv",
  size: 50,
};
function request(body: object = ticket, headers: Record<string, string> = {}) {
  return new Request(`http://localhost:3000/api/projects/${id}/dataset/preview`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
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
  expect((await POST(request(ticket, { Origin: "https://evil.example" }), context)).status).toBe(
    403,
  );
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
it("enforces the configured direct-upload size", async () => {
  expect((await POST(request({ ...ticket, size: 101 }), context)).status).toBe(422);
  expect(m.analyze).not.toHaveBeenCalled();
});
it("rejects upload references outside the authenticated project", async () => {
  expect((await POST(request({ ...ticket, path: "other/project/file.csv" }), context)).status).toBe(
    422,
  );
  expect(m.analyze).not.toHaveBeenCalled();
});
it("forwards a signed storage link after ownership checks and never caches", async () => {
  const result = await POST(request(), context);
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toBe("no-store");
  expect(m.analyze).toHaveBeenCalledWith(
    expect.stringContaining("supabase.co/storage"),
    "data.csv",
    50,
    { userId: "owner", projectId: id },
    expect.any(Object),
  );
  expect(m.persist).toHaveBeenCalledOnce();
});
