import { describe, expect, it } from "vitest";
import { distanceKm, sortByDistance } from "@/features/dealers/dealer-distance";
import { locatePostcode } from "@/features/dealers/postcode-locations";

const berlin = { latitude: 52.5163, longitude: 13.3889 };
const munich = { latitude: 48.1374, longitude: 11.5755 };

describe("distanceKm", () => {
  it("measures great-circle distances", () => {
    expect(distanceKm(berlin, berlin)).toBe(0);
    // Berlin to Munich is about 504 km as the crow flies.
    expect(distanceKm(berlin, munich)).toBeGreaterThan(495);
    expect(distanceKm(berlin, munich)).toBeLessThan(515);
  });
});

describe("sortByDistance", () => {
  const dealers = [
    { name: "Zentrum Süd", ...munich },
    { name: "Am Tor", ...berlin },
    { name: "Bünde", latitude: 52.2, longitude: 8.58 }
  ];

  it("puts the nearest dealer first", () => {
    const sorted = sortByDistance(dealers, { latitude: 52.3, longitude: 8.6 });
    expect(sorted.map((dealer) => dealer.name)).toEqual(["Bünde", "Am Tor", "Zentrum Süd"]);
    expect(sorted[0].distanceKm).toBeLessThan(15);
  });

  it("falls back to the alphabet without a position", () => {
    const sorted = sortByDistance(dealers, null);
    expect(sorted.map((dealer) => dealer.name)).toEqual(["Am Tor", "Bünde", "Zentrum Süd"]);
    expect(sorted.every((dealer) => dealer.distanceKm === null)).toBe(true);
  });
});

describe("locatePostcode", () => {
  it("finds a postcode, ignoring spaces", () => {
    const point = locatePostcode(" 10117 ");
    expect(point && distanceKm(point, berlin)).toBeLessThan(5);
  });

  it("falls back to the postcodes sharing the first digits", () => {
    // 32299 is not assigned; the 322xx area around Bünde and Herford is.
    const point = locatePostcode("32299");
    expect(point && distanceKm(point, { latitude: 52.2, longitude: 8.58 })).toBeLessThan(30);
    expect(locatePostcode("80")).not.toBeNull();
  });

  it("refuses what is no German postcode", () => {
    expect(locatePostcode("")).toBeNull();
    expect(locatePostcode("SW1A 1AA")).toBeNull();
    expect(locatePostcode("1")).toBeNull();
  });
});
