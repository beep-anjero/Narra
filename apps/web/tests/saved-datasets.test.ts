// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(),
  list: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ ...m, storage: { from: () => m } }),
}));
import { persistDataset, getSavedDataset, removeProjectFiles } from "@/lib/api/saved-datasets";
import type { DatasetAnalysis } from "@/features/upload/contracts";
const scope = { userId: "owner", projectId: "project" };
const analysis: DatasetAnalysis = {
  preview: {
    filename: "data.csv",
    file_size: 4,
    row_count: 1,
    column_count: 1,
    columns: ["A"],
    rows: [["1"]],
    preview_limit: 100,
    truncated: false,
  },
  column_metadata: [
    {
      name: "A",
      detected_type: "numeric",
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 1,
      sample_values: ["1"],
    },
  ],
  filter_context: { token: "t".repeat(43), expires_in_seconds: 900, fields: [] },
};
beforeEach(() => {
  vi.resetAllMocks();
  for (const fn of [m.from, m.select, m.eq]) fn.mockReturnValue(m);
  m.upload.mockResolvedValue({ error: null });
  m.rpc.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue({ error: null });
  m.maybeSingle.mockResolvedValue({ data: null, error: null });
});
it("uses generated storage paths and strips ephemeral cache tokens from the saved snapshot", async () => {
  await persistDataset(scope, new ArrayBuffer(4), "../../sales.csv", analysis);
  expect(m.upload.mock.calls[0]?.[0]).toMatch(/^owner\/project\/[0-9a-f-]+\.csv$/);
  expect(m.rpc.mock.calls[0]?.[1].p_analysis.filter_context.token).toBeNull();
});
it("cleans up a definitively failed save but preserves an ambiguous or committed save", async () => {
  m.rpc.mockResolvedValue({ error: { message: "failure" } });
  await expect(persistDataset(scope, new ArrayBuffer(4), "data.csv", analysis)).rejects.toThrow(
    /confirm/,
  );
  expect(m.remove).toHaveBeenCalledOnce();
  m.remove.mockClear();
  m.maybeSingle.mockResolvedValue({ data: null, error: { message: "offline" } });
  await expect(persistDataset(scope, new ArrayBuffer(4), "data.csv", analysis)).rejects.toThrow();
  expect(m.remove).not.toHaveBeenCalled();
  m.maybeSingle.mockResolvedValue({ data: { id: "committed" }, error: null });
  await persistDataset(scope, new ArrayBuffer(4), "data.csv", analysis);
  expect(m.remove).not.toHaveBeenCalled();
});
it("validates persisted snapshots before rendering them", async () => {
  m.maybeSingle.mockResolvedValue({ data: { analysis: { bad: true } }, error: null });
  await expect(getSavedDataset("project")).rejects.toThrow(/incompatible/);
  m.maybeSingle.mockResolvedValue({ data: { analysis }, error: null });
  expect((await getSavedDataset("project"))?.analysis.preview.rows).toEqual([["1"]]);
});
it("removes every storage page before project deletion and surfaces failures", async () => {
  m.list
    .mockResolvedValueOnce({ data: [{ name: "a.csv" }], error: null })
    .mockResolvedValueOnce({ data: [], error: null });
  await removeProjectFiles(scope);
  expect(m.remove).toHaveBeenCalledWith(["owner/project/a.csv"]);
  m.list.mockResolvedValue({ data: null, error: { message: "offline" } });
  await expect(removeProjectFiles(scope)).rejects.toThrow(/list/);
});
