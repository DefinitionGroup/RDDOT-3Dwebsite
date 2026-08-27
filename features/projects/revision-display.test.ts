import { describe, expect, it } from "vitest";
import {
  createRevisionDisplaySnapshot,
  parseRevisionDisplaySnapshot
} from "@/features/projects/revision-display";
import {
  DEFAULT_CONFIGURATOR_STATE,
  RDTD_KITCHEN_PRODUCT_V1_VERSION,
  RDTD_KITCHEN_PRODUCT_VERSION
} from "@/features/configurator/product-definition";

describe("Configuration Revision display snapshot", () => {
  it("captures stable German labels and the historical quote", () => {
    const snapshot = createRevisionDisplaySnapshot(
      {
        ...DEFAULT_CONFIGURATOR_STATE,
        cabinetColorKey: "oak",
        frontColorKey: "verde-kitami"
      },
      RDTD_KITCHEN_PRODUCT_VERSION
    );

    expect(snapshot).toMatchObject({
      schemaVersion: 2,
      cabinetFinish: "Eiche warm",
      frontFinish: "Fenix Verde Kitami",
      layoutLabel: "Küchenzeile, 8 Module · Insel standard",
      currency: "EUR"
    });
    expect(parseRevisionDisplaySnapshot(snapshot)).toEqual(snapshot);
  });

  it("keeps stored v1 snapshots parseable for history display", () => {
    const legacy = {
      schemaVersion: 1,
      productTitle: "Signature Küche",
      layoutLabel: "Küchenzeile, gerade",
      cabinetFinish: "Graphit",
      frontFinish: "Porzellan",
      totalCents: 1010310,
      currency: "EUR"
    };

    expect(parseRevisionDisplaySnapshot(legacy)).toEqual(legacy);
  });

  it("rejects incomplete historical display data", () => {
    expect(parseRevisionDisplaySnapshot({ schemaVersion: 1 })).toBeNull();
  });

  it("refuses to invent display data for an unknown Product Definition", () => {
    expect(() =>
      createRevisionDisplaySnapshot(
        DEFAULT_CONFIGURATOR_STATE,
        "rdtdot-signature-kitchen-v1@retired"
      )
    ).toThrow("Unsupported Product Definition version");
  });

  it("fails closed when checkpointing against the retired v1 definition", () => {
    expect(() =>
      createRevisionDisplaySnapshot(
        {
          schemaVersion: 1,
          productKey: "rdtdot-signature-kitchen-v1",
          layout: "straight-line",
          cabinetColorKey: "graphite",
          frontColorKey: "porcelain"
        },
        RDTD_KITCHEN_PRODUCT_V1_VERSION
      )
    ).toThrow("Unsupported Product Definition version");
  });
});
