// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { previewDataset } from "@/lib/api/analytics";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function config() {
  vi.stubEnv("ANALYTICS_API_URL", "http://analytics:8000");
  vi.stubEnv("ANALYTICS_API_KEY", "test-only-key-with-at-least-32-characters");
}
it("fails closed if the analytics key is absent", async () => {
  vi.stubEnv("ANALYTICS_API_KEY", "");
  await expect(previewDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
    "not configured",
  );
});
it("turns backend connection failures into a useful error", async () => {
  config();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  await expect(previewDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
    "Start the service",
  );
});
it("returns deterministic CSV validation messages", async () => {
  config();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          error: {
            code: "duplicate_headers",
            message: "This CSV contains duplicate column names.",
          },
        },
        { status: 422 },
      ),
    ),
  );
  await expect(previewDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
    "duplicate column names",
  );
});
it("rejects invalid backend success payloads", async () => {
  config();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ rows: [] })));
  await expect(previewDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
    "invalid preview",
  );
});
