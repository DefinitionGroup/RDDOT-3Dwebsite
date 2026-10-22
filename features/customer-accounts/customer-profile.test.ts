import { describe, expect, it } from "vitest";
import { customerProfileSchema, profileInitials } from "./customer-profile";

describe("customer profile", () => {
  it("accepts an empty profile and trims what is filled in", () => {
    expect(customerProfileSchema.parse({ name: "", phone: "", postalCode: "" })).toEqual({
      name: "",
      phone: "",
      postalCode: ""
    });
    expect(customerProfileSchema.parse({ name: "  Anna Weber ", phone: " 030 1234 ", postalCode: " 10115 " })).toEqual({
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

  it("draws initials from the name, else from the email", () => {
    expect(profileInitials("Anna Maria Weber", "a@example.com")).toBe("AW");
    expect(profileInitials("özlem", "a@example.com")).toBe("Ö");
    expect(profileInitials("  ", "kunde@example.com")).toBe("K");
  });
});
