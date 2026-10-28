import { describe, expect, it } from "vitest";
import {
  keepQuoteRequestDraft,
  QUOTE_REQUEST_DRAFT_LIFETIME_MS,
  type QuoteRequestDraftFields,
  takeQuoteRequestDraft
} from "./quote-request-draft";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key)
  };
}

const typed: QuoteRequestDraftFields = {
  contact: {
    name: "Anna Weber",
    email: "anna@example.invalid",
    phone: "+49 30 1234567",
    postalCode: "10115",
    salutation: "frau",
    title: "Dr.",
    contactChannel: "phone",
    contactTime: "morning",
    customerType: "private",
    company: "",
    professionalRole: ""
  },
  planning: { projectKind: "renovation", timeframe: "3-6-months", budgetBand: "15-25k" },
  wallLength: "372",
  note: "Bitte mit Nischenrückwand in Stein.",
  consent: true
};

describe("quote request draft", () => {
  const savedAt = new Date("2026-10-28T10:00:00Z");
  const later = (ms: number) => new Date(savedAt.getTime() + ms);

  it("gives back what was typed, once", () => {
    const storage = memoryStorage();
    keepQuoteRequestDraft(storage, "project-1", typed, savedAt);

    expect(takeQuoteRequestDraft(storage, "project-1", later(5 * 60_000))).toEqual(typed);
    expect(takeQuoteRequestDraft(storage, "project-1", later(5 * 60_000))).toBeNull();
  });

  it("keeps each project's draft to itself", () => {
    const storage = memoryStorage();
    keepQuoteRequestDraft(storage, "project-1", typed, savedAt);

    expect(takeQuoteRequestDraft(storage, "project-2", savedAt)).toBeNull();
    expect(takeQuoteRequestDraft(storage, "project-1", savedAt)).not.toBeNull();
  });

  it("lets a draft go after half an hour", () => {
    const storage = memoryStorage();
    keepQuoteRequestDraft(storage, "project-1", typed, savedAt);

    expect(takeQuoteRequestDraft(storage, "project-1", later(QUOTE_REQUEST_DRAFT_LIFETIME_MS + 1))).toBeNull();
    expect(storage.items.size).toBe(0);
  });

  it("drops the consent when its wording has changed since", () => {
    const storage = memoryStorage();
    keepQuoteRequestDraft(storage, "project-1", typed, savedAt);
    const [key, value] = [...storage.items][0];
    storage.setItem(key, value.replace(/"consentVersion":"[^"]+"/, '"consentVersion":"anfrage-datenschutz-2020-01"'));

    expect(takeQuoteRequestDraft(storage, "project-1", savedAt)).toEqual({ ...typed, consent: false });
  });

  it("does not keep a consent that was not given", () => {
    const storage = memoryStorage();
    keepQuoteRequestDraft(storage, "project-1", { ...typed, consent: false }, savedAt);

    expect(takeQuoteRequestDraft(storage, "project-1", savedAt)?.consent).toBe(false);
  });

  it("ignores and removes what is not a draft", () => {
    const storage = memoryStorage();
    storage.setItem("signature-quote-request-draft:project-1", "{not json");
    expect(takeQuoteRequestDraft(storage, "project-1", savedAt)).toBeNull();

    keepQuoteRequestDraft(storage, "project-1", { ...typed, note: "x".repeat(2001) }, savedAt);
    expect(takeQuoteRequestDraft(storage, "project-1", savedAt)).toBeNull();
    expect(storage.items.size).toBe(0);
  });

  it("works without storage the browser refuses", () => {
    const refusing = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined
    };
    expect(keepQuoteRequestDraft(refusing, "project-1", typed, savedAt)).toBe(false);
    expect(takeQuoteRequestDraft(refusing, "project-1", savedAt)).toBeNull();
  });
});
