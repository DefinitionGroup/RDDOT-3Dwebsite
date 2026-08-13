import { describe, expect, it } from "vitest";
import {
  hashConfiguration,
  parseConfiguration
} from "@/features/projects/configuration-contract";

const validConfiguration = {
  schemaVersion: 1,
  productKey: "signature-line",
  layout: "straight-line",
  cabinetColorKey: "carbon",
  frontColorKey: "clay"
} as const;

describe("configuration contract", () => {
  it("parses and hashes a valid normalized configuration deterministically", () => {
    const first = parseConfiguration(validConfiguration);
    const second = parseConfiguration({ ...validConfiguration });

    expect(hashConfiguration(first)).toBe(hashConfiguration(second));
    expect(hashConfiguration(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects unknown fields instead of silently changing persisted meaning", () => {
    expect(() =>
      parseConfiguration({ ...validConfiguration, unsupportedOption: true })
    ).toThrow();
  });
});
