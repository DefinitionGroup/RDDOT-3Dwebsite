import { expect, test, type Page } from "@playwright/test";
import { watchErrors } from "./browser-errors";

/**
 * The journey a customer takes, end to end on the real build: from the
 * homepage into the configurator, a finish changed, the kitchen saved as a
 * Project through sign-in, shared as a link a stranger can open, and requested
 * from rotpunkt. Sign-in reads its code from the development email capture.
 * The browser runs without WebGL, so the configurator shows its poster;
 * `scene.smoke.ts` checks the 3D scene itself.
 */

const FRONT = "Fenix Castoro Ottawa";

/** What three.js, React and the configurator log when the scene gives way to the poster. */
const POSTER_ERRORS = [
  /A WebGL context could not be created/,
  /Error creating WebGL context/,
  /3D scene unavailable, showing the visual fallback/
];

/** The price under the Datenblatt, e.g. "10.674 €", with a plain space before the sign. */
async function datasheetPrice(page: Page) {
  const row = page.getByText("Richtpreis inkl. MwSt., unverbindlich", { exact: true }).locator("..");
  const text = await row.innerText();
  const price = /[\d.]+\s€/.exec(text)?.[0];
  if (!price) throw new Error(`No price in "${text}"`);
  return price.replace(/\s/, " ");
}

/** The value the Datenblatt lists for a term, e.g. "Front". */
function datasheetValue(page: Page, term: string) {
  return page.locator(`dt:text-is("${term}") + dd`);
}

test("a kitchen goes from the homepage to a saved, shared and requested Project", async ({ browser, page }) => {
  const errors: string[] = [];
  watchErrors(page, errors);
  const email = `smoke-${Date.now()}@example.invalid`;

  await test.step("the homepage leads into the configurator", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Küchen, auf den Punkt.");
    // The hero's call to action; the header and the closing section repeat it.
    await page.getByRole("main").getByRole("link", { name: "Küche konfigurieren" }).first().click();
    await expect(page).toHaveURL(/\/configure/);
  });

  const priceBefore = await test.step("picking a front changes the kitchen, its URL and its price", async () => {
    await expect(page.getByText("Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar.")).toBeVisible();
    const front = page.getByRole("group", { name: "Front" });
    await expect(front).toBeVisible();
    const price = await datasheetPrice(page);
    const url = page.url();

    await front.getByRole("button", { name: FRONT }).click();
    await expect(front.getByRole("button", { name: FRONT })).toHaveAttribute("aria-pressed", "true");
    await expect(datasheetValue(page, "Front")).toContainText(FRONT);
    await expect(page).not.toHaveURL(url);
    await expect.poll(() => datasheetPrice(page)).not.toBe(price);
    return price;
  });

  const priceSaved = await datasheetPrice(page);
  expect(priceSaved).not.toBe(priceBefore);

  await test.step("a guest saves the kitchen as a Project through sign-in", async () => {
    await page.getByRole("button", { name: /^Speichern & Teilen/ }).click();
    await page.getByRole("button", { name: "Als Projekt speichern" }).click();
    await expect(page).toHaveURL(/\/konto\?intent=save/);

    await page.getByRole("textbox", { name: "E-Mail-Adresse" }).fill(email);
    await page.getByRole("button", { name: "Code anfordern" }).click();
    await page.getByRole("button", { name: /^\d{6} zum Einsetzen$/ }).click();
    await page.getByRole("button", { name: "Sicher anmelden" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mein Bereich.");
    await expect(page.getByText(`Angemeldet als ${email}`).first()).toBeVisible();
    await expect(page.getByRole("link", { name: `Front ${FRONT}` })).toContainText(priceSaved);
  });

  await test.step("the Project opens in the configurator as it was saved", async () => {
    await page.getByRole("link", { name: `Front ${FRONT}` }).click();
    await expect(page).toHaveURL(/\/configure\?project=[0-9a-f-]{36}/);
    await expect(datasheetValue(page, "Front")).toContainText(FRONT);
    expect(await datasheetPrice(page)).toBe(priceSaved);
  });

  const shareUrl = await test.step("the Project creates a share link", async () => {
    const section = page.getByRole("button", { name: /^Versionen & Freigaben/ });
    if ((await section.getAttribute("aria-expanded")) !== "true") await section.click();
    await page.getByRole("button", { name: "Link erstellen" }).click();
    const link = page.getByRole("textbox", { name: "Diesen Link jetzt sichern" });
    await expect(link).toHaveValue(/\/share\/[0-9a-f-]{36}#.+/);
    return link.inputValue();
  });

  await test.step("someone without an account opens the shared kitchen", async () => {
    const stranger = await browser.newContext({ locale: "de-DE" });
    const shared = await stranger.newPage();
    watchErrors(shared, errors);
    await shared.goto(shareUrl);
    await expect(shared.getByText("Geteilter, unveränderlicher Küchenstand ohne private Projektdaten.")).toBeVisible();
    await expect(datasheetValue(shared, "Front")).toContainText(FRONT);
    expect(await datasheetPrice(shared)).toBe(priceSaved);
    await expect(shared.getByRole("link", { name: "Eigene Küche konfigurieren" })).toBeVisible();
    await stranger.close();
  });

  await test.step("the Project is requested from rotpunkt and listed in the account", async () => {
    await page.getByRole("link", { name: "Konfiguration anfragen" }).click();
    await expect(page).toHaveURL(/\/anfrage\?project=[0-9a-f-]{36}/);
    await expect(page.getByRole("textbox", { name: "E-Mail-Adresse" })).toHaveValue(email);
    const summary = page.getByRole("complementary");
    await expect(summary).toContainText(FRONT);
    const amount = priceSaved.replaceAll(".", "\\.").replace(" ", "\\s");
    await expect(summary).toContainText(new RegExp(`Richtpreis\\s*${amount}`));

    await page.getByRole("textbox", { name: "Name", exact: true }).fill("Smoke Test");
    await page.getByRole("checkbox", { name: /Ich bin damit einverstanden/ }).check();
    await page.getByRole("button", { name: "Anfrage senden" }).click();

    await expect(page.getByText("Anfrage gespeichert")).toBeVisible();
    await expect(page.getByText("Referenz")).toBeVisible();
    await page.getByRole("link", { name: "Zu meinen Anfragen" }).click();
    await expect(page.getByRole("link", { name: "Anfragen 1" })).toBeVisible();
  });

  expect(errors.filter((error) => !POSTER_ERRORS.some((poster) => poster.test(error)))).toEqual([]);
});
