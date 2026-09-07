import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/features/marketing/site-header";

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
