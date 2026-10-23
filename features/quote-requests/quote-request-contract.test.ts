import { describe, expect, it } from "vitest";
import { quoteRequestContactSchema, quoteRequestSubmissionSchema } from "./quote-request-contract";

const submission = {
  expectedVersion: 3,
  idempotencyKey: "0f3e0a52-4f6d-4a39-9d0c-3a1f6d6c6a11",
  contact: { name: "Mara Vogel", email: "Mara@Example.com", phone: "" },
  note: "",
  consent: true
};

describe("quote request contract", () => {
  it("still takes the older body: no planning facts, no details, all read as no answer", () => {
    const parsed = quoteRequestSubmissionSchema.parse(submission);
    expect(parsed.planning).toEqual({ projectKind: "", timeframe: "", budgetBand: "", wallLengthCm: null });
    expect(parsed.contact).toMatchObject({ email: "mara@example.com", phone: null, salutation: "", postalCode: "" });
  });

  it("takes the planning facts and refuses a wall length outside 100 to 2000 cm", () => {
    const planning = { projectKind: "renovation", timeframe: "3-6-months", budgetBand: "15-25k", wallLengthCm: 372 };
    expect(quoteRequestSubmissionSchema.parse({ ...submission, planning }).planning).toEqual(planning);
    for (const wallLengthCm of [99, 2001, 372.5]) {
      expect(quoteRequestSubmissionSchema.safeParse({ ...submission, planning: { wallLengthCm } }).success).toBe(false);
    }
    expect(quoteRequestSubmissionSchema.safeParse({ ...submission, planning: { budgetBand: "lots" } }).success).toBe(false);
  });

  it("copies the contact rules: a number to call, a company for professionals, a valid postcode", () => {
    const contact = submission.contact;
    expect(quoteRequestContactSchema.safeParse({ ...contact, contactChannel: "phone" }).success).toBe(false);
    expect(quoteRequestContactSchema.safeParse({ ...contact, phone: "030 1234", contactChannel: "phone" }).success).toBe(
      true
    );
    expect(quoteRequestContactSchema.safeParse({ ...contact, customerType: "professional" }).success).toBe(false);
    expect(quoteRequestContactSchema.parse({ ...contact, customerType: "", company: "Vogel GmbH" }).company).toBe("");
    expect(quoteRequestContactSchema.parse({ ...contact, postalCode: " 10115 " }).postalCode).toBe("10115");
    expect(quoteRequestContactSchema.safeParse({ ...contact, postalCode: "10115 Berlin" }).success).toBe(false);
  });
});
