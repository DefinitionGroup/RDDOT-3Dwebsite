// Builds features/dealers/data/postcode-locations-de.json, the table that puts a
// customer's profile postcode on the map so the Dealer Directory can sort
// nearest first (ADR 0014). Source: the GeoNames postal-code dump for Germany,
// licensed CC BY 4.0 (https://www.geonames.org, download.geonames.org/export/zip/DE.zip).
//
//   node scripts/build-postcode-locations.mjs <path/to/DE.txt>
//
// Each postcode keeps the mean of its places, rounded to 0.01° (about 1 km).

import { readFileSync, writeFileSync } from "node:fs";

const source = process.argv[2];
if (!source) throw new Error("Pass the path of the unzipped GeoNames DE.txt");

const sums = new Map();
for (const line of readFileSync(source, "utf8").split("\n")) {
  const columns = line.split("\t");
  if (columns.length < 11 || columns[0] !== "DE") continue;
  const postcode = columns[1];
  const latitude = Number(columns[9]);
  const longitude = Number(columns[10]);
  if (!/^\d{5}$/.test(postcode) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    continue;
  }
  const sum = sums.get(postcode) ?? [0, 0, 0];
  sums.set(postcode, [sum[0] + latitude, sum[1] + longitude, sum[2] + 1]);
}

const round = (value) => Math.round(value * 100) / 100;
// One string, `postcode,latitude,longitude` entries joined by `;`: TypeScript
// types a string cheaply, where ten thousand keys would slow every type check.
const entries = [...sums.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([postcode, [latitude, longitude, count]]) =>
      `${postcode},${round(latitude / count)},${round(longitude / count)}`
  );

const output = "features/dealers/data/postcode-locations-de.json";
writeFileSync(
  output,
  `${JSON.stringify({
    source: "GeoNames postal codes DE (https://www.geonames.org), CC BY 4.0",
    postcodes: entries.join(";")
  })}\n`
);
console.log(`Wrote ${entries.length} postcodes to ${output}`);
