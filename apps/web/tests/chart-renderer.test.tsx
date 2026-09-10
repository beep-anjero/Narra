import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({
  init: vi.fn(),
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@/features/charts/echarts-runtime", () => ({ init: runtime.init }));
import { ChartRenderer } from "@/features/charts/chart-renderer";
const recommendation = {
  chart_type: "histogram" as const,
  title: "Score distribution",
  x_column: "Score",
  y_column: null,
  aggregation: "count" as const,
  reason: "Numeric",
  score: 0.8,
  valid_rows: 2,
};
const chart = {
  recommendation_index: 0,
  data: [{ x: "1–2", y: 2 }],
  note: "All values",
  error: null,
};
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it("initializes, observes size, and disposes on unmount", async () => {
  runtime.init.mockReturnValue(runtime);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = runtime.observe;
      disconnect = runtime.disconnect;
    },
  );
  const view = render(<ChartRenderer recommendation={recommendation} chart={chart} />);
  await waitFor(() => expect(runtime.setOption).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("img", { name: "Score distribution" })).toBeInTheDocument();
  expect(runtime.observe).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(runtime.disconnect).toHaveBeenCalledTimes(1);
  expect(runtime.dispose).toHaveBeenCalledTimes(1);
});
it("shows a recoverable renderer error", async () => {
  runtime.init.mockImplementation(() => {
    throw new Error("Renderer unavailable");
  });
  render(<ChartRenderer recommendation={recommendation} chart={chart} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("data is available below");
});
