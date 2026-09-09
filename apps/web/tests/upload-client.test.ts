// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { analyzeDataset } from "@/lib/api/analytics";
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
  await expect(analyzeDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
    "not configured",
  );
});
it("turns backend connection failures into a useful error", async () => {
  config();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  await expect(analyzeDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
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
  await expect(analyzeDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
    "duplicate column names",
  );
});
it("rejects invalid backend success payloads", async () => {
  config();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ rows: [] })));
  await expect(analyzeDataset(new ArrayBuffer(1), "x.csv", "text/csv")).rejects.toThrow(
    "invalid analysis",
  );
});

it("uses one authenticated analysis request and returns preview with metadata", async () => {
  config();
  const payload = {
    preview: {
      filename: "x.csv",
      file_size: 8,
      row_count: 1,
      column_count: 1,
      columns: ["Value"],
      rows: [["12"]],
      preview_limit: 100,
      truncated: false,
    },
    column_metadata: [
      {
        name: "Value",
        detected_type: "numeric",
        missing_count: 0,
        missing_percentage: 0,
        unique_count: 1,
        sample_values: ["12"],
      },
    ],
  };
  const fetcher = vi.fn().mockResolvedValue(Response.json(payload));
  vi.stubGlobal("fetch", fetcher);
  expect(await analyzeDataset(new ArrayBuffer(8), "x.csv", "text/csv")).toEqual(payload);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith(
    "http://analytics:8000/api/v1/datasets/analyze",
    expect.objectContaining({
      method: "POST",
      cache: "no-store",
      headers: expect.objectContaining({
        Authorization: "Bearer test-only-key-with-at-least-32-characters",
      }),
    }),
  );
});
