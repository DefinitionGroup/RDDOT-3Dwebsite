export type GeoPoint = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

function radians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function distanceKm(from: GeoPoint, to: GeoPoint) {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * The Dealer Directory's order: nearest first from the customer's position,
 * alphabetically when there is none (ADR 0014).
 */
export function sortByDistance<T extends GeoPoint & { name: string }>(
  dealers: readonly T[],
  origin: GeoPoint | null
): Array<T & { distanceKm: number | null }> {
  return dealers
    .map((dealer) => ({
      ...dealer,
      distanceKm: origin ? distanceKm(origin, dealer) : null
    }))
    .sort(
      (a, b) =>
        (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || a.name.localeCompare(b.name, "de")
    );
}
