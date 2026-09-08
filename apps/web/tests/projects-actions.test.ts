// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/lib/api/projects", () => ({ projectContext: mocks.context }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { saveProject, deleteProject } from "@/features/projects/actions";
const id = "11111111-1111-4111-8111-111111111111";
function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([k, v]) => data.set(k, v));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({ user: { id: "owner" }, client: { from: mocks.from } });
  for (const method of [
    mocks.from,
    mocks.insert,
    mocks.update,
    mocks.delete,
    mocks.eq,
    mocks.select,
  ])
    method.mockReturnValue(mocks);
  mocks.maybeSingle.mockResolvedValue({ data: { id }, error: null });
});
it("uses the authenticated owner and trimmed details on creation", async () => {
  await expect(
    saveProject({}, form({ name: " Sales ", description: " Details ", user_id: "attacker" })),
  ).rejects.toThrow(`REDIRECT:/project/${id}`);
  expect(mocks.insert).toHaveBeenCalledWith({
    name: "Sales",
    description: "Details",
    user_id: "owner",
  });
});
it("checks authentication before a write", async () => {
  mocks.context.mockRejectedValue(new Error("unauthorized"));
  await expect(saveProject({}, form({ name: "Sales" }))).rejects.toThrow("unauthorized");
  expect(mocks.from).not.toHaveBeenCalled();
});
it("rejects blank names and invalid IDs", async () => {
  expect((await saveProject({}, form({ name: " " }))).message).toBeTruthy();
  expect((await saveProject({}, form({ name: "Sales", id: "invalid" }))).message).toBe(
    "Invalid project ID.",
  );
  expect(mocks.from).not.toHaveBeenCalled();
});
it("scopes updates to the owner and selected ID", async () => {
  expect((await saveProject({}, form({ id, name: "Renamed" }))).success).toBe(true);
  expect(mocks.eq).toHaveBeenCalledWith("id", id);
  expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
});
it("does not report success when a project is inaccessible", async () => {
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await saveProject({}, form({ id, name: "Renamed" }))).success).toBeUndefined();
});
it("returns useful errors without leaking provider internals", async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: null,
    error: { message: "private database detail" },
  });
  const result = await saveProject({}, form({ name: "Sales" }));
  expect(result.message).toContain("migration");
  expect(result.message).not.toContain("private");
});
it("requires explicit deletion confirmation", async () => {
  expect((await deleteProject({}, form({ id }))).message).toContain("DELETE");
  expect(mocks.delete).not.toHaveBeenCalled();
});
it("scopes deletion and redirects after success", async () => {
  await expect(deleteProject({}, form({ id, confirmation: "DELETE" }))).rejects.toThrow(
    "REDIRECT:/dashboard?notice=deleted",
  );
  expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner");
  expect(mocks.eq).toHaveBeenCalledWith("id", id);
});
