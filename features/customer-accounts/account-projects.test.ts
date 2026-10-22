import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIGURATOR_STATE,
  RDTD_KITCHEN_PRODUCT_VERSION
} from "@/features/configurator/product-definition";
import { describeAccountProject } from "./account-projects";

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Meine Küche",
  lifecycle: "active" as const,
  updatedAt: new Date("2026-10-23T08:00:00Z"),
  deletionDueAt: null,
  workingConfiguration: {
    configuration: { ...DEFAULT_CONFIGURATOR_STATE, cabinetColorKey: "oak", frontColorKey: "walnut-memory" },
    productDefinitionVersion: RDTD_KITCHEN_PRODUCT_VERSION
  }
};

describe("describeAccountProject", () => {
  it("names the finishes in the page's language and carries their look", () => {
    const card = describeAccountProject(project, "en");
    expect(card.summary?.cabinet).toEqual({ label: "Warm oak", hex: "#9d8060", textureUrl: null });
    expect(card.summary?.front.label).toBe("Walnut Memory");
    expect(card.summary?.front.textureUrl).toMatch(/walnut/);
    expect(card.summary?.price).toMatch(/^€[\d,]+$/);
    expect(card.updatedAt).toBe("2026-10-23T08:00:00.000Z");
  });

  it("keeps the card without a summary when the product version is gone", () => {
    const retired = { ...project, workingConfiguration: { ...project.workingConfiguration, productDefinitionVersion: "retired@1" } };
    expect(describeAccountProject(retired, "de")).toEqual({
      id: project.id,
      name: "Meine Küche",
      lifecycle: "active",
      updatedAt: "2026-10-23T08:00:00.000Z",
      deletionDueAt: null,
      summary: null
    });
  });
});
