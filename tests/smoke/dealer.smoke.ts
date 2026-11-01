import { randomUUID } from "node:crypto";
import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import pg from "pg";
import { watchErrors } from "./browser-errors";

/**
 * Dealer access (ADR 0014) on the real build. A customer saves a kitchen and
 * shares it with a Dealer chosen from the directory. A Dealer User signs in to
 * the Dealer Workspace, sees the customer's contact, opens the Project,
 * changes its front and requests it with their own contact. The customer sees
 * both, then ends the share, and the dealer finds nothing any more; a user of
 * another Dealer never finds anything.
 *
 * rotpunkt provisions dealers, so the test writes its own straight into the
 * server's database, `DATABASE_URL`: a throwaway one, as in CI. It refuses a
 * Neon host and skips without a database (a deployed test site, for one).
 */

const FRONT = "Nussbaum Memory";
const POSTER_ERRORS = [
  /A WebGL context could not be created/,
  /Error creating WebGL context/,
  /3D scene unavailable, showing the visual fallback/
];

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "Needs DATABASE_URL, the server's throwaway database, to provision a dealer");

const stamp = Date.now();
const dealer = { id: randomUUID(), name: `Smoke Küchen ${stamp}` };
const dealerUser = { id: randomUUID(), email: `smoke-dealer-${stamp}@example.invalid` };
const otherDealer = { id: randomUUID(), name: `Smoke Andere ${stamp}` };
const otherUser = { id: randomUUID(), email: `smoke-other-${stamp}@example.invalid` };

test.beforeAll(async () => {
  if (new URL(databaseUrl ?? "").hostname.endsWith("neon.tech")) {
    throw new Error("The dealer smoke test writes dealers; run it only against a throwaway database");
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const [row, user] of [
      [dealer, dealerUser],
      [otherDealer, otherUser]
    ] as const) {
      await client.query(
        `INSERT INTO app.dealer (id, name, street, postal_code, city, latitude, longitude)
         VALUES ($1, $2, 'Musterstraße 1', '32257', 'Bünde', 52.2, 8.58)`,
        [row.id, row.name]
      );
      await client.query(
        `INSERT INTO app.dealer_user (id, dealer_id, email, name, phone)
         VALUES ($1, $2, $3, 'Smoke Händler', '+49 5223 0000 100')`,
        [user.id, row.id, user.email]
      );
    }
  } finally {
    await client.end();
  }
});

/** Signs in on the page's sign-in panel with the code from the development email capture. */
async function signIn(page: Page, email: string) {
  await page.getByRole("textbox", { name: "E-Mail-Adresse" }).fill(email);
  await page.getByRole("button", { name: "Code anfordern" }).click();
  await page.getByRole("button", { name: /^\d{6} zum Einsetzen$/ }).click();
  await page.getByRole("button", { name: "Sicher anmelden" }).click();
}

/** A second person on the same kind of device, without anyone's cookies. */
async function personOnSameDevice(browser: Browser, options: BrowserContextOptions, errors: string[]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  watchErrors(page, errors);
  return page;
}

test("a customer shares a Project with a dealer, who edits and requests it, until the customer ends it", async ({
  browser,
  page,
  viewport,
  isMobile,
  hasTouch,
  userAgent,
  deviceScaleFactor,
  locale
}) => {
  const errors: string[] = [];
  watchErrors(page, errors);
  const device = { viewport, isMobile, hasTouch, userAgent, deviceScaleFactor, locale };
  const customerEmail = `smoke-customer-${stamp}@example.invalid`;

  const projectId = await test.step("a customer saves a kitchen as a Project", async () => {
    await page.goto("/configure");
    await page.getByRole("button", { name: /^Speichern & Teilen/ }).click();
    await page.getByRole("button", { name: "Als Projekt speichern" }).click();
    await signIn(page, customerEmail);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mein Bereich.");
    const card = page.locator('a[href*="/configure?project="]').first();
    await expect(card).toBeVisible();
    return /project=([0-9a-f-]{36})/.exec((await card.getAttribute("href")) ?? "")?.[1] ?? "";
  });
  expect(projectId).toMatch(/^[0-9a-f-]{36}$/);

  await test.step("the customer shares it with a dealer from the directory", async () => {
    await page.getByRole("button", { name: /^Aktionen für / }).click();
    await page.getByRole("button", { name: "Mit Händler teilen" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Mit einem Händler teilen." })).toBeVisible();
    await expect(dialog).toContainText(customerEmail);
    await dialog.getByRole("searchbox", { name: "Händler suchen" }).fill(dealer.name);
    await dialog.getByRole("radio", { name: new RegExp(dealer.name) }).check();
    await dialog.getByRole("button", { name: `Mit ${dealer.name} teilen` }).click();
    await expect(page.getByText(`Geteilt mit ${dealer.name}`, { exact: false }).first()).toBeVisible();
  });

  const dealerPage = await personOnSameDevice(browser, device, errors);

  await test.step("the dealer finds it in the Dealer Workspace with the customer's contact", async () => {
    await dealerPage.goto("/haendler");
    await expect(dealerPage.getByRole("heading", { name: "Für Händler." })).toBeVisible();
    await signIn(dealerPage, dealerUser.email);
    await expect(dealerPage.getByRole("heading", { name: "Geteilte Projekte." })).toBeVisible();
    await expect(dealerPage.getByRole("link", { name: customerEmail })).toBeVisible();
  });

  await test.step("the dealer changes the front, which saves into the customer's Project", async () => {
    await dealerPage.getByRole("link", { name: "Öffnen" }).click();
    await expect(dealerPage).toHaveURL(new RegExp(`/configure\\?project=${projectId}`));
    // A dealer edits; photos and copies stay the owner's.
    await expect(dealerPage.getByRole("button", { name: "Foto erzeugen" })).toHaveCount(0);
    await dealerPage.getByRole("group", { name: "Front" }).getByRole("button", { name: FRONT }).click();
    await expect
      .poll(async () => {
        const response = await dealerPage.request.get(`/api/projects/${projectId}/configuration`);
        return ((await response.json()) as { version: number }).version;
      })
      .toBeGreaterThan(1);
  });

  await test.step("the dealer requests it with their own contact", async () => {
    await dealerPage.goto(`/anfrage?project=${projectId}`);
    await expect(dealerPage.getByRole("textbox", { name: "E-Mail-Adresse" })).toHaveValue(dealerUser.email);
    await expect(dealerPage.getByRole("complementary")).toContainText(FRONT);
    await dealerPage.getByRole("checkbox", { name: /Ich bin damit einverstanden/ }).check();
    await dealerPage.getByRole("button", { name: "Anfrage senden" }).click();
    await expect(dealerPage.getByText("Anfrage gespeichert")).toBeVisible();
    await expect(dealerPage.getByRole("link", { name: "Händlerbereich" })).toBeVisible();
  });

  await test.step("a user of another dealer finds nothing", async () => {
    const other = await personOnSameDevice(browser, device, errors);
    await other.goto("/haendler");
    await signIn(other, otherUser.email);
    await expect(other.getByText("Noch hat niemand ein Projekt mit Ihnen geteilt.", { exact: false })).toBeVisible();
    const response = await other.request.get(`/api/projects/${projectId}/configuration`);
    expect(response.status()).toBe(404);
    await other.context().close();
  });

  await test.step("the customer sees the change and the request, then ends the share", async () => {
    await page.reload();
    await expect(page.getByRole("link", { name: `Front ${FRONT}` })).toBeVisible();
    await expect(page.getByRole("link", { name: "Anfragen 1" })).toBeVisible();
    await page.getByRole("button", { name: /^Aktionen für / }).click();
    await page.getByRole("button", { name: "Freigabe beenden" }).click();
    await page.getByRole("button", { name: "Ja, Freigabe beenden" }).click();
    await expect(page.getByText(`Geteilt mit ${dealer.name}`, { exact: false })).toHaveCount(0);
  });

  await test.step("the dealer no longer finds the Project", async () => {
    await dealerPage.goto("/haendler");
    await expect(dealerPage.getByText("Noch hat niemand ein Projekt mit Ihnen geteilt.", { exact: false })).toBeVisible();
    const response = await dealerPage.request.get(`/api/projects/${projectId}/configuration`);
    expect(response.status()).toBe(404);
  });

  await dealerPage.context().close();
  expect(errors.filter((error) => !POSTER_ERRORS.some((poster) => poster.test(error)))).toEqual([]);
});
