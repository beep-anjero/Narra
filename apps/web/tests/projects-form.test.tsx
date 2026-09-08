import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
vi.mock("@/features/projects/actions", () => ({
  saveProject: vi.fn(async () => ({ message: "Database unavailable" })),
  deleteProject: vi.fn(async () => ({ message: "Could not delete project" })),
}));
import { ProjectForm, DeleteProjectForm } from "@/features/projects/project-form";
it("labels inputs and displays save failures", async () => {
  const user = userEvent.setup();
  render(<ProjectForm />);
  await user.type(screen.getByLabelText("Project name"), "Sales");
  await user.click(screen.getByRole("button", { name: "Create project" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");
});
it("requires a deliberate deletion confirmation", () => {
  render(<DeleteProjectForm id="test" />);
  expect(screen.getByLabelText("Confirm deletion")).toBeRequired();
  expect(screen.getByLabelText("Confirm deletion")).toHaveAttribute("pattern", "DELETE");
});
