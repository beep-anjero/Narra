// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { demoNameSchema } from "@/features/demo/catalog";
import { demoSnapshot } from "@/features/demo/snapshots";
import { demoCsv } from "@/lib/api/demo";
it("serves five real pipeline snapshots with bounded data and working filter definitions", () => {
  for (const name of demoNameSchema.options) {
    const data = demoSnapshot(name);
    expect(data.preview.row_count).toBe(240);
    expect(data.preview.rows).toHaveLength(100);
    expect(data.recommendations?.length).toBeGreaterThanOrEqual(3);
    expect(data.charts?.every((chart) => chart.error === null)).toBe(true);
    expect(data.insights?.length).toBeGreaterThan(0);
    expect(data.filter_context?.fields.length).toBeGreaterThan(0);
    expect(data.filter_context?.token).toBeNull();
  }
});
it("only downloads allowlisted sample files", async () => {
  expect(demoNameSchema.safeParse("../../.env").success).toBe(false);
  const csv = await demoCsv("ecommerce-sales");
  expect(csv.toString().split("\n")[0]).toBe(
    "Date,Category,Region,Revenue,Units,Advertising Spend",
  );
});
