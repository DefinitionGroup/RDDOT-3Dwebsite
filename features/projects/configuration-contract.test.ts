import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  hashConfiguration,
  parseConfiguration
} from "@/features/projects/configuration-contract";

const V1_CONFIGURATION = {
  schemaVersion: 1,
  productKey: "rdtdot-signature-kitchen-v1",
  layout: "straight-line",
  cabinetColorKey: "graphite",
  frontColorKey: "porcelain"
} as const;

const V2_CONFIGURATION = {
  schemaVersion: 2,
  productKey: "rdtdot-signature-kitchen-v1",
  layout: "straight-line",
  cabinetColorKey: "graphite",
  frontColorKey: "porcelain",
  wallModules: ["big", "device", "small", "small", "small", "small", "device", "big"],
  islandSize: 4
} as const;

describe("configuration contract", () => {
  it("parses both state generations", () => {
    expect(parseConfiguration(V1_CONFIGURATION)).toEqual(V1_CONFIGURATION);
    expect(parseConfiguration(V2_CONFIGURATION)).toEqual(V2_CONFIGURATION);
  });

  it("rejects unknown schema versions and extra fields", () => {
    expect(() => parseConfiguration({ ...V1_CONFIGURATION, schemaVersion: 3 })).toThrow();
    expect(() => parseConfiguration({ ...V2_CONFIGURATION, extra: true })).toThrow();
    expect(() =>
      parseConfiguration({ ...V2_CONFIGURATION, wallModules: ["huge"] })
    ).toThrow();
    expect(() =>
      parseConfiguration({ ...V2_CONFIGURATION, islandSize: 3 })
    ).toThrow();
  });

  it("keeps v1 hashes byte-compatible with the stored dedup hashes", () => {
    const legacy = createHash("sha256")
      .update(JSON.stringify(V1_CONFIGURATION))
      .digest("hex");

    expect(hashConfiguration(parseConfiguration(V1_CONFIGURATION))).toBe(legacy);
  });

  it("hashes v2 configurations independent of key order", () => {
    const reordered = parseConfiguration({
      islandSize: V2_CONFIGURATION.islandSize,
      wallModules: [...V2_CONFIGURATION.wallModules],
      frontColorKey: V2_CONFIGURATION.frontColorKey,
      cabinetColorKey: V2_CONFIGURATION.cabinetColorKey,
      layout: V2_CONFIGURATION.layout,
      productKey: V2_CONFIGURATION.productKey,
      schemaVersion: V2_CONFIGURATION.schemaVersion
    });

    expect(hashConfiguration(reordered)).toBe(
      hashConfiguration(parseConfiguration(V2_CONFIGURATION))
    );
  });

  it("hashes different module orders differently: the sequence is the layout", () => {
    const reorderedModules = parseConfiguration({
      ...V2_CONFIGURATION,
      wallModules: ["device", "big", "small", "small", "small", "small", "device", "big"]
    });

    expect(hashConfiguration(reorderedModules)).not.toBe(
      hashConfiguration(parseConfiguration(V2_CONFIGURATION))
    );
  });
});
