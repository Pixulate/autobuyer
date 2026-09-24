import { locationIndex } from "@/lib/geohash";

export type PlaceSuggestion = {
  id: string;
  label: string;
  detail: string;
};

export type ResolvedPlace = {
  label: string;
  placeId: string;
  lat: number;
  lng: number;
  geohash: string;
  geohashPrefixes: string[];
  city: string;
  region: string;
  country: string;
  postal: string;
};

function googleKey() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  ).trim();
}

function sessionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let googleSession = sessionToken();

export function resetPlaceSession() {
  googleSession = sessionToken();
}

function indexed(placeId: string, label: string, lat: number, lng: number, parts: Partial<ResolvedPlace>): ResolvedPlace {
  return {
    label,
    placeId,
    ...locationIndex(lat, lng),
    city: parts.city ?? "",
    region: parts.region ?? "",
    country: parts.country ?? "",
    postal: parts.postal ?? "",
  };
}

type AddressBits = { city: string; region: string; country: string; postal: string };

function fromGoogleComponents(components: { longText?: string; shortText?: string; types?: string[] }[]): AddressBits {
  const pick = (type: string, short = false) => {
    const row = components.find((item) => item.types?.includes(type));
    if (!row) return "";
    return (short ? row.shortText : row.longText) || row.longText || row.shortText || "";
  };
  return {
    city: pick("locality") || pick("postal_town") || pick("sublocality"),
    region: pick("administrative_area_level_1", true),
    country: pick("country", true),
    postal: pick("postal_code"),
  };
}

async function googleAutocomplete(query: string): Promise<PlaceSuggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": googleKey(),
    },
    body: JSON.stringify({
      input: query,
      sessionToken: googleSession,
      languageCode: "en",
      includedRegionCodes: ["ca"],
    }),
  });
  if (!res.ok) {
    throw new Error("Could not search places.");
  }
  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
      };
    }[];
  };
  return (data.suggestions ?? [])
    .map((item) => {
      const pred = item.placePrediction;
      if (!pred?.placeId) return null;
      const label = pred.structuredFormat?.mainText?.text || pred.text?.text || "";
      const detail = pred.structuredFormat?.secondaryText?.text || pred.text?.text || "";
      return { id: pred.placeId.replace(/^places\//, ""), label, detail };
    })
    .filter((item): item is PlaceSuggestion => !!item && !!item.label);
}

async function googleDetails(placeId: string): Promise<ResolvedPlace> {
  const id = placeId.replace(/^places\//, "");
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?sessionToken=${encodeURIComponent(googleSession)}&languageCode=en`,
    {
      headers: {
        "X-Goog-Api-Key": googleKey(),
        "X-Goog-FieldMask": "id,formattedAddress,displayName,location,addressComponents",
      },
    }
  );
  resetPlaceSession();
  if (!res.ok) {
    throw new Error("Could not load that place.");
  }
  const data = (await res.json()) as {
    id?: string;
    formattedAddress?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
  };
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  if (lat == null || lng == null) {
    throw new Error("That place has no map coordinates.");
  }
  const bits = fromGoogleComponents(data.addressComponents ?? []);
  const label = data.formattedAddress || data.displayName?.text || bits.city;
  return indexed(data.id?.replace(/^places\//, "") || id, label, lat, lng, bits);
}

const photonCache = new Map<string, ResolvedPlace>();

async function photonSearch(query: string): Promise<PlaceSuggestion[]> {
  const resolved = await photonResolve(query);
  return resolved.map((item) => {
    photonCache.set(item.placeId, item);
    return {
      id: item.placeId,
      label: item.label,
      detail: [item.city, item.region, item.country].filter(Boolean).join(", "),
    };
  });
}

async function photonDetails(id: string, fallbackQuery: string): Promise<ResolvedPlace> {
  const cached = photonCache.get(id);
  if (cached) return cached;
  const results = await photonResolve(fallbackQuery);
  const match = results.find((item) => item.placeId === id) ?? results[0];
  if (!match) {
    throw new Error("Could not load that place.");
  }
  return match;
}

async function photonResolve(query: string): Promise<ResolvedPlace[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en&lat=56.13&lon=-106.35&zoom=3`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error("Could not search places.");
  }
  const data = (await res.json()) as {
    features?: {
      geometry?: { coordinates?: number[] };
      properties?: {
        osm_id?: number;
        osm_type?: string;
        name?: string;
        street?: string;
        housenumber?: string;
        city?: string;
        state?: string;
        country?: string;
        postcode?: string;
      };
    }[];
  };
  return (data.features ?? [])
    .map((feature) => {
      const coords = feature.geometry?.coordinates;
      const props = feature.properties;
      if (!coords || coords.length < 2 || !props) return null;
      const lng = coords[0];
      const lat = coords[1];
      const street = [props.housenumber, props.street].filter(Boolean).join(" ");
      const city = props.city || "";
      const region = props.state || "";
      const labelParts = [street || props.name, city, region].filter(Boolean);
      const label = labelParts.join(", ") || query;
      return indexed(`photon:${props.osm_type ?? "n"}:${props.osm_id ?? `${lat},${lng}`}`, label, lat, lng, {
        city,
        region,
        country: props.country || "",
        postal: props.postcode || "",
      });
    })
    .filter((item): item is ResolvedPlace => !!item);
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  if (googleKey()) {
    return googleAutocomplete(trimmed);
  }
  return photonSearch(trimmed);
}

export async function resolvePlace(suggestion: PlaceSuggestion): Promise<ResolvedPlace> {
  if (googleKey() && !suggestion.id.startsWith("photon:")) {
    return googleDetails(suggestion.id);
  }
  return photonDetails(suggestion.id, [suggestion.label, suggestion.detail].filter(Boolean).join(" "));
}

export async function geocodeQuery(query: string): Promise<ResolvedPlace | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  if (googleKey()) {
    const suggestions = await googleAutocomplete(trimmed);
    if (!suggestions[0]) return null;
    return googleDetails(suggestions[0].id);
  }
  const resolved = await photonResolve(trimmed);
  return resolved[0] ?? null;
}

export function emptyPlaceFields() {
  return {
    location: "",
    placeId: "",
    lat: null as number | null,
    lng: null as number | null,
    geohash: "",
    geohashPrefixes: [] as string[],
    locationCity: "",
    locationRegion: "",
    locationCountry: "",
    locationPostal: "",
  };
}

export function placeFields(place: ResolvedPlace) {
  return {
    location: place.label,
    placeId: place.placeId,
    lat: place.lat,
    lng: place.lng,
    geohash: place.geohash,
    geohashPrefixes: place.geohashPrefixes,
    locationCity: place.city,
    locationRegion: place.region,
    locationCountry: place.country,
    locationPostal: place.postal,
  };
}
