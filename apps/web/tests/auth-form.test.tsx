import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }));
vi.mock("@/features/auth/actions", () => mocks);

import { AuthForm } from "@/features/auth/auth-form";
import type { AuthFormState } from "@/features/auth/schemas";

beforeEach(() => vi.resetAllMocks());

describe("auth forms", () => {
  it("explains missing configuration and disables submission", () => {
    render(<AuthForm mode="login" next="/dashboard" enabled={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("account service isn’t connected");
    expect(screen.getByRole("button", { name: "Log in" })).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
  });
  it("keeps the password unchanged when visibility is toggled", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" next="/dashboard" enabled />);
    const password = screen.getByLabelText("Password");
    await user.type(password, " a long passphrase ");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue(" a long passphrase ");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });
  it("disables duplicate submissions while pending and exposes provider feedback", async () => {
    let resolveAction!: (state: AuthFormState) => void;
    mocks.login.mockImplementation(
      () =>
        new Promise<AuthFormState>((resolve) => {
          resolveAction = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<AuthForm mode="login" next="/project/123" enabled />);
    await user.type(screen.getByLabelText("Email address"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "my passphrase");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByRole("button", { name: "Logging in…" })).toBeDisabled();
    const submitted: FormData = mocks.login.mock.calls[0]?.[1];
    expect(submitted.get("next")).toBe("/project/123");
    resolveAction({ status: "error", message: "The email or password is incorrect." });
    expect(await screen.findByRole("alert")).toHaveTextContent("email or password is incorrect");
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });
  it("associates server validation feedback with the field", async () => {
    mocks.register.mockResolvedValue({
      status: "error",
      fieldErrors: { confirmPassword: ["The passwords do not match."] },
    });
    const user = userEvent.setup();
    render(<AuthForm mode="register" next="/dashboard" enabled />);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "true"),
    );
    expect(screen.getByLabelText("Confirm password")).toHaveAccessibleDescription(
      "The passwords do not match.",
    );
  });
  it("replaces signup fields with confirmation guidance after a successful request", async () => {
    mocks.register.mockResolvedValue({
      status: "success",
      message: "Check your inbox for a confirmation link.",
    });
    const user = userEvent.setup();
    render(<AuthForm mode="register" next="/dashboard" enabled />);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeVisible();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute(
      "href",
      "/login?next=%2Fdashboard",
    );
  });
});
