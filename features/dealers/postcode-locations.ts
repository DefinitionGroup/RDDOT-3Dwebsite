import "server-only";

import table from "@/features/dealers/data/postcode-locations-de.json";
import type { GeoPoint } from "@/features/dealers/dealer-distance";

// German postcodes to positions, from the GeoNames postal-code dump (CC BY 4.0,
// https://www.geonames.org), built by scripts/build-postcode-locations.mjs.

let postcodeTable: Map<string, GeoPoint> | undefined;
const prefixMeans = new Map<number, Map<string, GeoPoint>>();

/** `postcode,latitude,longitude` entries joined by `;`, parsed on first use. */
function postcodes() {
  postcodeTable ??= new Map(
    table.postcodes.split(";").map((entry) => {
      const [postcode, latitude, longitude] = entry.split(",");
      return [postcode, { latitude: Number(latitude), longitude: Number(longitude) }];
    })
  );
  return postcodeTable;
}

function meansByPrefix(length: number) {
  let means = prefixMeans.get(length);
  if (!means) {
    const sums = new Map<string, [number, number, number]>();
    for (const [postcode, { latitude, longitude }] of postcodes()) {
      const prefix = postcode.slice(0, length);
      const sum = sums.get(prefix) ?? [0, 0, 0];
      sums.set(prefix, [sum[0] + latitude, sum[1] + longitude, sum[2] + 1]);
    }
    means = new Map(
      [...sums].map(([prefix, [latitude, longitude, count]]) => [
        prefix,
        { latitude: latitude / count, longitude: longitude / count }
      ])
    );
    prefixMeans.set(length, means);
  }
  return means;
}

/**
 * Where a German postcode lies: its own position, else the middle of the
 * postcodes sharing its first three or two digits. Null when nothing matches.
 */
export function locatePostcode(input: string): GeoPoint | null {
  const postcode = input.replace(/\s/g, "");
  if (!/^\d{2,5}$/.test(postcode)) return null;

  const exact = postcodes().get(postcode);
  if (exact) return exact;

  for (const length of [3, 2]) {
    if (postcode.length < length) continue;
    const mean = meansByPrefix(length).get(postcode.slice(0, length));
    if (mean) return mean;
  }
  return null;
}
