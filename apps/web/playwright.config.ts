import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
const testKey = "narra-local-e2e-service-key-not-a-production-secret";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", testMatch: "public.spec.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testMatch: "public.spec.ts", use: { ...devices["Pixel 7"] } },
    {
      name: "lifecycle",
      testMatch: "lifecycle.spec.ts",
      use: { ...devices["Desktop Chrome"], trace: "off", screenshot: "off" },
    },
  ],
  webServer: [
    {
      command: "uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8107",
      cwd: path.resolve(__dirname, "../analytics"),
      url: "http://127.0.0.1:8107/api/v1/health",
      reuseExistingServer: false,
      timeout: 120000,
      env: { ANALYTICS_API_KEY: testKey },
    },
    {
      command: "pnpm exec next start --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120000,
      env: { ANALYTICS_API_URL: "http://127.0.0.1:8107", ANALYTICS_API_KEY: testKey },
    },
  ],
});
