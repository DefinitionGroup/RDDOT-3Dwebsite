import { expect, test } from "@playwright/test";
import { watchErrors } from "./browser-errors";

/**
 * The configurator builds its 3D scene from the kitchen model. A model the
 * Asset Manifest cannot account for, or a scene that fails to build, swaps
 * itself for the poster (ADR 0009) and logs why; neither may happen here. On a
 * runner without a GPU the scene is software-rendered, so pixels prove nothing.
 */
test("the configurator builds the kitchen in 3D", async ({ page }) => {
  const errors: string[] = [];
  watchErrors(page, errors);
  const model = page.waitForResponse((response) => new URL(response.url()).pathname === "/models/kitchen-modules.glb");

  await page.goto("/configure");
  expect((await model).ok()).toBe(true);
  await expect(page.getByRole("main").locator("canvas").first()).toBeVisible();

  // The swap happens within a few frames of the model arriving.
  await page.waitForTimeout(5_000);
  await expect(page.getByRole("img", { name: "Signature Küche in Graphit und Porzellan, fotografiert im Studio." })).toHaveCount(0);
  expect(errors).toEqual([]);
});
