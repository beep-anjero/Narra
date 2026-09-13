import { test, expect } from "@playwright/test";
import path from "node:path";

// Explicitly run with test:e2e:lifecycle against a configured disposable test account.
// E2E_CREATE_ACCOUNT=1 adds registration for local Supabase with email autoconfirm.
test("account → upload → filter → logout → reopen → delete", async ({ page }) => {
  test.setTimeout(180000);
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password)
    throw new Error(
      "Set E2E_EMAIL and E2E_PASSWORD for a disposable confirmed test account and apply all Supabase migrations. See docs/testing.md.",
    );
  if (process.env.E2E_CREATE_ACCOUNT === "1") {
    await page.goto("/register");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Log out" }).click();
  }
  async function login() {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await login();
  await page.getByRole("link", { name: "New Analysis" }).click();
  await page.getByLabel("Project name").fill(`Narra E2E ${Date.now()}`);
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page).toHaveURL(/\/project\/[0-9a-f-]+$/);
  const projectUrl = page.url();
  await page
    .getByLabel("Or choose a CSV file")
    .setInputFiles(path.resolve("../../sample-data/ecommerce-sales.csv"));
  await page.getByRole("button", { name: "Validate CSV" }).click();
  await expect(page.getByText("Dataset analyzed and saved. Your dashboard is ready.")).toBeVisible({
    timeout: 90000,
  });
  await expect(page.getByRole("img").first().locator("svg")).toBeVisible();
  await page.getByLabel("Add a filter").selectOption("Region");
  await page.getByLabel("Select values (multiple allowed)").selectOption("North");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("status").filter({ hasText: "of 240" })).toContainText("80 of 240");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await login();
  await page.goto(projectUrl);
  await expect(page.getByText(/Saved privately to your project/)).toBeVisible();
  await expect(page.getByRole("img").first().locator("svg")).toBeVisible();
  await page.getByLabel("Add a filter").selectOption("Region");
  await page.getByLabel("Select values (multiple allowed)").selectOption("North");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("status")).toContainText("80 of 240");
  await page.getByRole("link", { name: "Data", exact: true }).click();
  await expect(page.getByRole("table", { name: /Preview of/ })).toBeVisible();
  await page.goto(`${projectUrl}/settings`);
  await page.getByLabel("Confirm deletion").fill("DELETE");
  await page.getByRole("button", { name: "Delete project", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?notice=deleted/);
  await page.goto(projectUrl);
  await expect(page.getByRole("heading", { name: /not found|unavailable/i })).toBeVisible();
});
