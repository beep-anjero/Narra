import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AnalysisCta } from "@/features/marketing/analysis-cta";
import { SiteHeader } from "@/features/marketing/site-header";

describe("analysis entry point", () => {
  it("explains availability, traps keyboard focus, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<AnalysisCta />);
    const trigger = screen.getByRole("button", { name: "Analyze a Dataset" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog", { name: "A clearer view is coming." });
    expect(
      within(dialog).getByText(/CSV uploads and personal dashboards aren’t available yet/),
    ).toBeVisible();
    // Repeated Tab presses must remain inside the dialog, even after wrapping.
    for (let step = 0; step < 4; step++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("offers a real preview destination and closes after it is selected", async () => {
    const user = userEvent.setup();
    render(<AnalysisCta />);
    await user.click(screen.getByRole("button", { name: "Analyze a Dataset" }));
    const preview = screen.getByRole("link", { name: "Explore the preview" });
    expect(preview).toHaveAttribute("href", "#dashboard-preview");
    await user.click(preview);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("mobile navigation", () => {
  it("opens an accessible drawer and closes when a section is selected", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog", { name: "Explore Narra" })).toBeVisible();
    const navigation = screen.getByRole("navigation", { name: "Mobile navigation" });
    const features = within(navigation).getByRole("link", { name: "Features" });
    expect(features).toHaveAttribute("href", "#features");
    await user.click(features);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("supports Escape and returns focus to the navigation trigger", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
