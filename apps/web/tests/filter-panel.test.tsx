import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import type { DatasetAnalysis } from "@/features/upload/contracts";
const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/filters", () => ({ applyDashboardFilters: api }));
import { FilterPanel } from "@/features/filters/filter-panel";
const analysis: DatasetAnalysis = {
  preview: {
    filename: "data.csv",
    file_size: 100,
    row_count: 102,
    column_count: 1,
    columns: ["Value"],
    rows: [["10"]],
    preview_limit: 100,
    truncated: true,
  },
  column_metadata: [
    {
      name: "Value",
      detected_type: "numeric",
      missing_count: 0,
      missing_percentage: 0,
      unique_count: 2,
      sample_values: ["10"],
    },
  ],
  filter_context: {
    token: "t".repeat(43),
    expires_in_seconds: 900,
    fields: [
      { column: "Value", kind: "numeric", values: [] },
      { column: "Region", kind: "categorical", values: ["East", "West"] },
      { column: "Date", kind: "datetime", values: [] },
    ],
  },
};
beforeEach(() => {
  api.mockReset();
});

it("applies all draft filters in one request and resets them", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  api.mockResolvedValue(analysis);
  render(<FilterPanel projectId="p" analysis={analysis} onChange={change} />);
  await user.selectOptions(screen.getByLabelText("Add a filter"), "Value");
  await user.type(screen.getByLabelText("minimum"), "20");
  await user.selectOptions(screen.getByLabelText("Add a filter"), "Region");
  await user.selectOptions(screen.getByLabelText("Select values (multiple allowed)"), [
    "East",
    "West",
  ]);
  await user.selectOptions(screen.getByLabelText("Add a filter"), "Date");
  await user.type(screen.getByLabelText("start"), "2026-01-01");
  expect(api).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => expect(change).toHaveBeenCalledWith(analysis));
  expect(api.mock.calls[0]?.[1].filters).toHaveLength(3);
  expect(screen.getByRole("status")).toHaveTextContent("3 applied filters");
  await user.click(screen.getByRole("button", { name: "Reset filters" }));
  await waitFor(() => expect(api.mock.calls[1]?.[1].filters).toEqual([]));
});

it("retains previous results on error and rejects reversed bounds locally", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(<FilterPanel projectId="p" analysis={analysis} onChange={change} />);
  await user.selectOptions(screen.getByLabelText("Add a filter"), "Value");
  await user.type(screen.getByLabelText("minimum"), "20");
  await user.type(screen.getByLabelText("maximum"), "10");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(api).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("valid values");
  await user.clear(screen.getByLabelText("maximum"));
  api.mockRejectedValue(new Error("Analysis expired. Upload again."));
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Previous results remain unchanged");
  expect(change).not.toHaveBeenCalled();
});

it("shows a zero-match state", () => {
  render(
    <FilterPanel
      projectId="p"
      analysis={{ ...analysis, preview: { ...analysis.preview, row_count: 0, rows: [] } }}
      onChange={vi.fn()}
    />,
  );
  expect(screen.getByText(/No rows match the applied filters/)).toBeInTheDocument();
});
