import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import path from "node:path";

const filterStatus = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Dashboard filters" }).getByRole("status");

test("visitor opens demo, filters full dataset, resets, and downloads CSV", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("link", { name: "Try Demo Data", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ecommerce sales", exact: true })).toBeVisible();
  await expect(page.getByRole("img").first().locator("svg")).toBeVisible();
  await page.getByLabel("Add a filter").selectOption("Revenue");
  await page.getByLabel("minimum", { exact: true }).fill("500");
  await page.getByRole("button", { name: "Apply filters" }).click();
  const rows = readFileSync(path.resolve("../../sample-data/ecommerce-sales.csv"), "utf8")
    .trim()
    .split("\n")
    .slice(1);
  const expected = rows.filter((row) => Number(row.split(",")[3]) >= 500).length;
  await expect(filterStatus(page)).toContainText(`${expected} of 240`);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(filterStatus(page)).toContainText("240 of 240");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("ecommerce-sales.csv");
  expect(errors).toEqual([]);
});

test("handles zero matches and network failure without losing results", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("Add a filter").selectOption("Revenue");
  await page.getByLabel("minimum", { exact: true }).fill("999999");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByText("No rows match the applied filters. Adjust the ranges or reset filters."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(filterStatus(page)).toContainText("240 of 240");
  await page.route("**/api/demo/ecommerce-sales", (route) => route.abort());
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("region", { name: "Dashboard filters" }).getByRole("alert"),
  ).toContainText("Previous results remain unchanged");
  await expect(filterStatus(page)).toContainText("240 of 240");
});

test("sample switching, accessibility, and responsive layout", async ({ page }, testInfo) => {
  await page.goto("/demo");
  await page.getByLabel("Sample dataset").selectOption("marketing-campaign");
  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(
    page.getByRole("heading", { name: "Marketing campaigns", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("img").first().locator("svg")).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath("demo.png"), fullPage: true });
  await page
    .getByRole("heading", { name: "Your data, at a glance" })
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: testInfo.outputPath("dashboard-viewport.png") });
});

test("protects private pages and validates account forms", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?/);
  await page.getByLabel("Email address").fill("invalid");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please check the highlighted fields." }),
  ).toBeVisible();
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please check the highlighted fields." }),
  ).toBeVisible();
});
