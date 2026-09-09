import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { StatisticsPanel } from "@/features/upload/statistics-panel";
import type { DatasetStatistics } from "@/features/upload/statistics-contract";

const statistics: DatasetStatistics = {
  summary: {
    row_count: 200,
    column_count: 3,
    total_cells: 600,
    missing_cells: 2,
    missing_percentage: 0.33,
    complete_rows: 198,
    numeric_columns: 1,
    categorical_columns: 1,
    datetime_columns: 1,
    boolean_columns: 0,
    text_columns: 0,
  },
  columns: [
    {
      name: "Score",
      detected_type: "numeric",
      count: 199,
      missing: 1,
      missing_percentage: 0.5,
      unique_count: 1,
      invalid_count: 0,
      mean: 12,
      median: 12,
      minimum: 12,
      maximum: 12,
      standard_deviation: null,
      q1: 12,
      q3: 12,
    },
    {
      name: "Region",
      detected_type: "categorical",
      count: 199,
      missing: 1,
      missing_percentage: 0.5,
      unique_count: 1,
      top_value: "East",
      top_value_count: 199,
      top_categories: [{ value: "East", count: 199 }],
    },
    {
      name: "Date",
      detected_type: "datetime",
      count: 200,
      missing: 0,
      missing_percentage: 0,
      unique_count: 2,
      invalid_count: 0,
      earliest: "2026-09-01T00:00:00+00:00",
      latest: "2026-09-03T00:00:00+00:00",
      range_days: 2,
    },
  ],
};

it("shows full-data metrics and switches between numeric, category, and date statistics", async () => {
  const user = userEvent.setup();
  render(<StatisticsPanel statistics={statistics} />);
  expect(screen.getByText(/Calculated from all 200 rows/)).toBeInTheDocument();
  expect(screen.getByText("Standard deviation").nextElementSibling).toHaveTextContent(
    "Not available",
  );
  await user.selectOptions(screen.getByLabelText("Column statistics"), "1");
  expect(screen.getByText("Most frequent value").nextElementSibling).toHaveTextContent("East");
  expect(screen.getByRole("list")).toHaveTextContent("199");
  await user.selectOptions(screen.getByLabelText("Column statistics"), "2");
  expect(screen.getByText("Earliest (UTC)").nextElementSibling).toHaveTextContent(
    "2026-09-01T00:00:00+00:00",
  );
  expect(screen.queryByText("Standard deviation")).not.toBeInTheDocument();
});

it("reports missing statistics without fabricating values", () => {
  render(<StatisticsPanel />);
  expect(screen.getByRole("region", { name: "Statistics unavailable" })).toHaveTextContent(
    "upload the CSV again",
  );
  expect(screen.queryByText("Mean")).not.toBeInTheDocument();
});

it("shows an empty categorical column honestly", () => {
  const empty: DatasetStatistics = {
    ...statistics,
    columns: [
      {
        name: "Blank",
        detected_type: "text",
        count: 0,
        missing: 200,
        missing_percentage: 100,
        unique_count: 0,
        top_value: null,
        top_value_count: 0,
        top_categories: [],
      },
    ],
  };
  render(<StatisticsPanel statistics={empty} />);
  expect(screen.getByText("No non-missing values in this column.")).toBeInTheDocument();
});
