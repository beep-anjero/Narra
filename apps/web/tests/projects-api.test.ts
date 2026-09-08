// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  user: vi.fn(),
  client: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/session", () => ({ requireUser: m.user }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: m.client }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
import { getProject, listProjects } from "@/lib/api/projects";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  m.user.mockResolvedValue({ id: "owner" });
  m.client.mockResolvedValue(m);
  for (const method of [m.from, m.select, m.eq, m.order]) method.mockReturnValue(m);
  m.range.mockResolvedValue({ data: [], count: 0, error: null });
});
it("paginates reads and scopes them to the authenticated user", async () => {
  await listProjects(2);
  expect(m.range).toHaveBeenCalledWith(12, 23);
  expect(m.eq).toHaveBeenCalledWith("user_id", "owner");
});
it("rejects malformed IDs before querying", async () => {
  await expect(getProject("invalid")).rejects.toThrow("NOT_FOUND");
  expect(m.from).not.toHaveBeenCalled();
});
it("treats inaccessible and nonexistent projects equally", async () => {
  m.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(getProject(id)).rejects.toThrow("NOT_FOUND");
  expect(m.eq).toHaveBeenCalledWith("id", id);
  expect(m.eq).toHaveBeenCalledWith("user_id", "owner");
});
it("surfaces database failures instead of displaying an empty workspace", async () => {
  m.range.mockResolvedValue({ data: null, error: { message: "internal" } });
  await expect(listProjects(1)).rejects.toThrow("migration");
});
