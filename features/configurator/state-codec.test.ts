import { describe, expect, it } from "vitest";
import LZString from "lz-string";
import {
  decodeConfiguration,
  encodeConfiguration,
  getInitialConfiguratorState
} from "@/features/configurator/state-codec";
import { DEFAULT_CONFIGURATOR_STATE } from "@/features/configurator/product-definition";

describe("configuration URL codec", () => {
  it("round-trips the current v2 state", () => {
    const state = {
      ...DEFAULT_CONFIGURATOR_STATE,
      frontColorKey: "walnut-memory",
      wallModules: ["big", "small", "small", "big"] as const,
      islandSize: 2 as const
    };

    const decoded = decodeConfiguration(
      encodeConfiguration({ ...state, wallModules: [...state.wallModules] })
    );

    expect(decoded).toMatchObject({
      schemaVersion: 2,
      frontColorKey: "walnut-memory",
      wallModules: ["big", "small", "small", "big"],
      islandSize: 2
    });
  });

  it("upgrades legacy v1 guest URLs to the default layout with finishes kept", () => {
    const legacyPayload = LZString.compressToEncodedURIComponent(
      JSON.stringify({
        schemaVersion: 1,
        productKey: "rdtdot-signature-kitchen-v1",
        layout: "straight-line",
        cabinetColorKey: "oak",
        frontColorKey: "verde-kitami"
      })
    );

    const decoded = decodeConfiguration(legacyPayload);

    expect(decoded).toMatchObject({
      schemaVersion: 2,
      cabinetColorKey: "oak",
      frontColorKey: "verde-kitami",
      islandSize: 4
    });
  });

  it("falls back to the default state for garbage input", () => {
    expect(getInitialConfiguratorState("not-a-payload")).toEqual(
      DEFAULT_CONFIGURATOR_STATE
    );
    expect(getInitialConfiguratorState(null)).toEqual(DEFAULT_CONFIGURATOR_STATE);
  });
});
