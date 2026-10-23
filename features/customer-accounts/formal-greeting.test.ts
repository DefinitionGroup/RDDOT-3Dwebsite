import { describe, expect, it } from "vitest";
import { formalGreeting } from "./formal-greeting";

const vogel = { name: " Alex  Vogel ", title: "" };

describe("formalGreeting", () => {
  it("greets by salutation and last name in German, with the title", () => {
    expect(formalGreeting({ ...vogel, salutation: "frau", title: "Dr." }, "de")).toBe("Sehr geehrte Frau Dr. Vogel");
    expect(formalGreeting({ ...vogel, salutation: "herr" }, "de")).toBe("Sehr geehrter Herr Vogel");
  });

  it("greets divers and no answer by full name", () => {
    expect(formalGreeting({ ...vogel, salutation: "divers" }, "de")).toBe("Guten Tag Alex Vogel");
    expect(formalGreeting({ ...vogel, salutation: "", title: "Prof." }, "de")).toBe("Guten Tag Prof. Alex Vogel");
    expect(formalGreeting({ name: " ", salutation: "frau", title: "" }, "de")).toBe("Guten Tag");
  });

  it("has English and Spanish forms", () => {
    expect(formalGreeting({ ...vogel, salutation: "frau" }, "en")).toBe("Dear Ms Vogel");
    expect(formalGreeting({ ...vogel, salutation: "herr", title: "Dr" }, "en")).toBe("Dear Dr Vogel");
    expect(formalGreeting({ ...vogel, salutation: "" }, "en")).toBe("Dear Alex Vogel");
    expect(formalGreeting({ ...vogel, salutation: "frau", title: "Dra." }, "es")).toBe("Estimada Sra. Vogel");
    expect(formalGreeting({ ...vogel, salutation: "divers" }, "es")).toBe("Hola, Alex Vogel");
  });
});
