import type { Page } from "@playwright/test";

/** Collects a page's uncaught exceptions and console errors into `errors`. */
export function watchErrors(page: Page, errors: string[]) {
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${page.url()}: ${message.text()}`);
  });
}
