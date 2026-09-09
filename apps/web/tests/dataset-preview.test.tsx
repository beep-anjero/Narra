import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { PreviewTable } from "@/features/upload/preview-table";
import type { DatasetAnalysis } from "@/features/upload/contracts";

const preview: DatasetAnalysis["preview"] = {
  filename: "records.csv",
  file_size: 1000,
  row_count: 200,
  column_count: 2,
  columns: ["Score", "Name"],
  preview_limit: 100,
  truncated: true,
  rows: Array.from({ length: 100 }, (_, index) => [String(index + 1), `Person ${index + 1}`]),
};
const columns: DatasetAnalysis["column_metadata"] = [
  {
    name: "Score",
    detected_type: "numeric",
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 200,
    sample_values: ["1"],
  },
  {
    name: "Name",
    detected_type: "text",
    missing_count: 0,
    missing_percentage: 0,
    unique_count: 200,
    sample_values: ["Person 1"],
  },
];
const table = () => screen.getByRole("table");

it("paginates the bounded preview and reports its scope", async () => {
  const user = userEvent.setup();
  render(<PreviewTable preview={preview} columns={columns} />);
  expect(within(table()).getAllByRole("row")).toHaveLength(11);
  expect(screen.getByText(/first 100 rows/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(within(table()).getByText("Person 11")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Rows per page"), "50");
  expect(within(table()).getAllByRole("row")).toHaveLength(51);
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  expect(within(table()).getByText("Person 100")).toBeInTheDocument();
});

it("searches across preview values and resets pagination", async () => {
  const user = userEvent.setup();
  render(<PreviewTable preview={preview} columns={columns} />);
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.type(screen.getByLabelText("Search preview"), "PERSON 100");
  expect(within(table()).getAllByRole("row")).toHaveLength(2);
  expect(screen.getByRole("status")).toHaveTextContent("Page 1 of 1");
  await user.clear(screen.getByLabelText("Search preview"));
  await user.type(screen.getByLabelText("Search preview"), "absent");
  expect(screen.getByText("No preview rows match your search.")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("0–0 of 0");
});

it("sorts naturally in both directions without modifying source rows", async () => {
  const user = userEvent.setup();
  const source = {
    ...preview,
    rows: [
      ["10", "Ten"],
      ["2", "Two"],
      [" ", "NA"],
    ],
  };
  const before = JSON.stringify(source);
  render(<PreviewTable preview={source} columns={columns} />);
  await user.click(screen.getByRole("button", { name: "Sort by Score" }));
  expect(within(table()).getAllByRole("row")[1]).toHaveTextContent("Two");
  expect(screen.getAllByRole("columnheader")[1]).toHaveAttribute("aria-sort", "ascending");
  await user.click(screen.getByRole("button", { name: "Sort by Score" }));
  expect(within(table()).getAllByRole("row")[1]).toHaveTextContent("Ten");
  expect(within(table()).getAllByRole("row")[3]).toHaveTextContent("Missing");
  expect(within(table()).getByText("NA")).toBeInTheDocument();
  expect(JSON.stringify(source)).toBe(before);
});
