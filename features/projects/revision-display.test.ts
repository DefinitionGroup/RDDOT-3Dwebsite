import { describe, expect, it } from "vitest";
import {
  createRevisionDisplaySnapshot,
  parseRevisionDisplaySnapshot
} from "@/features/projects/revision-display";
import { RDTD_KITCHEN_PRODUCT_VERSION } from "@/features/configurator/product-definition";

describe("Configuration Revision display snapshot", () => {
  it("captures stable German labels and the historical quote", () => {
    const snapshot = createRevisionDisplaySnapshot(
      {
        schemaVersion: 1,
        productKey: "rdtdot-signature-kitchen-v1",
        layout: "straight-line",
        cabinetColorKey: "oak",
        frontColorKey: "verde-kitami"
      },
      RDTD_KITCHEN_PRODUCT_VERSION
    );

    expect(snapshot).toMatchObject({
      cabinetFinish: "Eiche warm",
      frontFinish: "Fenix Verde Kitami",
      currency: "EUR"
    });
    expect(parseRevisionDisplaySnapshot(snapshot)).toEqual(snapshot);
  });

  it("rejects incomplete historical display data", () => {
    expect(parseRevisionDisplaySnapshot({ schemaVersion: 1 })).toBeNull();
  });

  it("refuses to invent display data for an unknown Product Definition", () => {
    expect(() =>
      createRevisionDisplaySnapshot(
        {
          schemaVersion: 1,
          productKey: "rdtdot-signature-kitchen-v1",
          layout: "straight-line",
          cabinetColorKey: "graphite",
          frontColorKey: "porcelain"
        },
        "rdtdot-signature-kitchen-v1@retired"
      )
    ).toThrow("Unsupported Product Definition version");
  });
});
