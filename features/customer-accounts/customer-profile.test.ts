import { describe, expect, it } from "vitest";
import { customerProfileSchema, EMPTY_CUSTOMER_PROFILE, profileInitials } from "./customer-profile";

describe("customer profile", () => {
  it("accepts an empty profile and trims what is filled in", () => {
    expect(customerProfileSchema.parse({ name: "", phone: "", postalCode: "" })).toEqual(EMPTY_CUSTOMER_PROFILE);
    expect(customerProfileSchema.parse({ name: "  Anna Weber ", phone: " 030 1234 ", postalCode: " 10115 " })).toEqual({
      ...EMPTY_CUSTOMER_PROFILE,
      name: "Anna Weber",
      phone: "030 1234",
      postalCode: "10115"
    });
  });

  it("takes German and European postcodes and refuses anything else", () => {
    for (const postalCode of ["10115", "1010", "28001", "sw1a 1aa", "1012-AB"]) {
      expect(customerProfileSchema.safeParse({ name: "", phone: "", postalCode }).success).toBe(true);
    }
    for (const postalCode of ["12", "10115 Berlin", "-1011", "10115!"]) {
      expect(customerProfileSchema.safeParse({ name: "", phone: "", postalCode }).success).toBe(false);
    }
    expect(customerProfileSchema.parse({ name: "", phone: "", postalCode: "sw1a 1aa" }).postalCode).toBe("SW1A 1AA");
  });

  it("keeps a phone within the request's limits", () => {
    expect(customerProfileSchema.safeParse({ name: "", phone: "12", postalCode: "" }).success).toBe(false);
    expect(customerProfileSchema.safeParse({ name: "", phone: "1".repeat(41), postalCode: "" }).success).toBe(false);
  });

  it("keeps how to address and reach the person", () => {
    const profile = customerProfileSchema.parse({
      name: "Anna Weber",
      phone: "030 1234",
      postalCode: "",
      salutation: "frau",
      title: " Dr. ",
      contactChannel: "phone",
      contactTime: "morning",
      customerType: "professional",
      company: " Weber Innenarchitektur ",
      professionalRole: "architecture"
    });
    expect(profile).toMatchObject({ title: "Dr.", company: "Weber Innenarchitektur", contactChannel: "phone" });
    expect(customerProfileSchema.safeParse({ ...profile, salutation: "madame" }).success).toBe(false);
  });

  it("needs a number to call and a company for professionals, and drops a company otherwise", () => {
    expect(customerProfileSchema.safeParse({ ...EMPTY_CUSTOMER_PROFILE, contactChannel: "phone" }).success).toBe(false);
    expect(customerProfileSchema.safeParse({ ...EMPTY_CUSTOMER_PROFILE, customerType: "professional" }).success).toBe(
      false
    );
    expect(
      customerProfileSchema.parse({
        ...EMPTY_CUSTOMER_PROFILE,
        customerType: "private",
        company: "Weber GmbH",
        professionalRole: "trade"
      })
    ).toMatchObject({ company: "", professionalRole: "" });
  });

  it("draws initials from the name, else from the email", () => {
    expect(profileInitials("Anna Maria Weber", "a@example.com")).toBe("AW");
    expect(profileInitials("özlem", "a@example.com")).toBe("Ö");
    expect(profileInitials("  ", "kunde@example.com")).toBe("K");
  });
});
