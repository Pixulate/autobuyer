const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

const NEIGHBOR = {
  n: ["p0r21436x8zb9dcf5h7kjnmqesgutwvy", "bc01fg45238967deuvhjyznpkmstqrwx"],
  s: ["14365h7k9dcfesgujnmqp0r2twvyx8zb", "238967debc01fg45kmstqrwxuvhjyznp"],
  e: ["bc01fg45238967deuvhjyznpkmstqrwx", "p0r21436x8zb9dcf5h7kjnmqesgutwvy"],
  w: ["238967debc01fg45kmstqrwxuvhjyznp", "14365h7k9dcfesgujnmqp0r2twvyx8zb"],
} as const;

const BORDER = {
  n: ["prxz", "bcfguvyz"],
  s: ["028b", "0145hjnp"],
  e: ["bcfguvyz", "prxz"],
  w: ["0145hjnp", "028b"],
} as const;

export const GEOHASH_PRECISION = 9;
export const GEOHASH_PREFIX_MIN = 4;

export function encodeGeohash(lat: number, lng: number, precision = GEOHASH_PRECISION) {
  let minLat = -90;
  let maxLat = 90;
  let minLng = -180;
  let maxLng = 180;
  let hash = "";
  let bit = 0;
  let even = true;
  let ch = 0;

  while (hash.length < precision) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch = (ch << 1) + 1;
        minLng = mid;
      } else {
        ch <<= 1;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch = (ch << 1) + 1;
        minLat = mid;
      } else {
        ch <<= 1;
        maxLat = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

export function geohashPrefixes(hash: string, from = GEOHASH_PREFIX_MIN, to = GEOHASH_PRECISION) {
  const prefixes: string[] = [];
  const end = Math.min(to, hash.length);
  for (let i = from; i <= end; i += 1) {
    prefixes.push(hash.slice(0, i));
  }
  return prefixes;
}

export function locationIndex(lat: number, lng: number) {
  const geohash = encodeGeohash(lat, lng);
  return {
    lat,
    lng,
    geohash,
    geohashPrefixes: geohashPrefixes(geohash),
  };
}

type Direction = keyof typeof NEIGHBOR;

function adjacent(hash: string, dir: Direction): string {
  const last = hash.slice(-1);
  const parent = hash.slice(0, -1);
  const type = hash.length % 2;
  if (BORDER[dir][type].includes(last) && parent) {
    return adjacent(parent, dir) + BASE32[NEIGHBOR[dir][type].indexOf(last)];
  }
  return parent + BASE32[NEIGHBOR[dir][type].indexOf(last)];
}

function neighbors(hash: string) {
  const n = adjacent(hash, "n");
  const s = adjacent(hash, "s");
  return [n, s, adjacent(hash, "e"), adjacent(hash, "w"), adjacent(n, "e"), adjacent(n, "w"), adjacent(s, "e"), adjacent(s, "w")];
}

/** Cell edge length that still lets a 3×3 neighbor ring cover `radiusKm`. */
export function precisionForRadiusKm(radiusKm: number) {
  if (radiusKm >= 80) return 3;
  if (radiusKm >= 20) return 4;
  if (radiusKm >= 5) return 5;
  if (radiusKm >= 1.2) return 6;
  if (radiusKm >= 0.15) return 7;
  return 8;
}

/**
 * Coarse cells for a Firestore `array-contains-any` on `geohashPrefixes`
 * (max 10 values). Callers should still drop hits with `distanceKm`.
 */
export function geohashesForRadius(lat: number, lng: number, radiusKm: number) {
  const precision = precisionForRadiusKm(radiusKm);
  const hash = encodeGeohash(lat, lng, precision);
  return Array.from(new Set([hash, ...neighbors(hash)]));
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  return distanceKm(lat1, lng1, lat2, lng2) * 0.621371;
}
