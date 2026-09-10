import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { InsightPanel } from "@/features/insights/insight-card";

it("shows deterministic calculation evidence", async () => {
  const user = userEvent.setup();
  render(
    <InsightPanel
      insights={[
        {
          type: "correlation",
          title: "Related values",
          description: "Correlation does not establish causation.",
          severity: "info",
          columns: ["A", "B"],
          metadata: { pearson_r: 0.8, valid_pairs: 50 },
        },
      ]}
    />,
  );
  await user.click(screen.getByText("Calculation details"));
  expect(screen.getByText("pearson r")).toBeVisible();
  expect(screen.getByText("0.8")).toBeVisible();
});
it("handles no supported patterns", () => {
  render(<InsightPanel insights={[]} />);
  expect(screen.getByText("No supported patterns were found in these rows.")).toBeInTheDocument();
});
