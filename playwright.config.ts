import { defineConfig, devices } from "@playwright/test";

/**
 * The browser smoke test: one journey through the real build (`pnpm build`,
 * then `next start`). It needs a database with the migrations applied and the
 * development email capture, which shows the sign-in code on screen; CI runs
 * both against a throwaway Postgres (`.github/workflows/ci.yml`). Locally it
 * starts `next start` on port 3100 unless one is running there already, so
 * BETTER_AUTH_URL has to be http://localhost:3100. It signs up a new
 * `smoke-…@example.invalid` account in whichever database the server uses.
 */
const PORT = 3100;
const baseURL = process.env.SMOKE_BASE_URL ?? `http://localhost:${PORT}`;
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };
/** A Chromium phone at the width the layouts are checked at. */
const phone = { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: "tests/smoke",
  testMatch: "**/*.smoke.ts",
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure"
  },
  projects: [
    {
      // Without WebGL the configurator shows its poster (ADR 0009), and every
      // task must still work. A software-rendered scene would also hold several
      // cores for the whole journey on a runner without a GPU.
      name: "journey",
      testMatch: "journey.smoke.ts",
      use: { ...desktop, launchOptions: { args: ["--disable-3d-apis"] } }
    },
    {
      // The same journey at phone width, where the configurator's controls and
      // Datenblatt live in its bottom sheet.
      name: "journey-phone",
      testMatch: "journey.smoke.ts",
      use: { ...phone, launchOptions: { args: ["--disable-3d-apis"] } }
    },
    {
      // On a runner without a GPU, Chromium renders WebGL in software only with this switch.
      name: "scene",
      testMatch: "scene.smoke.ts",
      use: { ...desktop, launchOptions: { args: ["--enable-unsafe-swiftshader"] } }
    }
  ],
  webServer: process.env.SMOKE_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next start -p ${PORT}`,
        url: `${baseURL}/konto`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
      }
});
