type IconName =
  | "car-sport-outline"
  | "cash-outline"
  | "speedometer-outline"
  | "location-outline"
  | "add-circle-outline";

export type PreferenceKind = "body" | "budget" | "mileage" | "location" | "custom";

export type BuyerPreference = {
  id: string;
  kind: PreferenceKind;
  label: string;
  bodyStyle?: string;
  minPrice?: number;
  maxPrice?: number;
  minKm?: number;
  maxKm?: number;
  minMiles?: number;
  maxMiles?: number;
  city?: string;
  nearby?: boolean;
  customValue?: string;
};

export type VehicleInterest = {
  id: string;
  make: string;
  model: string;
  yearMin?: number;
  yearMax?: number;
  bodyStyle?: string;
  color?: string;
  tags: string[];
};

export type BuyerProfile = {
  name: string;
  status: string;
  location: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
  geohash: string;
  geohashPrefixes: string[];
  locationCity: string;
  locationRegion: string;
  locationCountry: string;
  locationPostal: string;
  bio: string;
  timeline: string;
  condition: string;
  payment: string;
  currentVehicle: string;
  preapproved: string;
  photoUrl: string;
  preferences: BuyerPreference[];
  interests: VehicleInterest[];
};

export const emptyProfile = (name = ""): BuyerProfile => ({
  name,
  status: "",
  location: "",
  placeId: "",
  lat: null,
  lng: null,
  geohash: "",
  geohashPrefixes: [],
  locationCity: "",
  locationRegion: "",
  locationCountry: "",
  locationPostal: "",
  bio: "",
  timeline: "",
  condition: "",
  payment: "",
  currentVehicle: "",
  preapproved: "",
  photoUrl: "",
  preferences: [],
  interests: [],
});

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const BODY_STYLES = [
  "SUV",
  "Crossover",
  "Sedan",
  "Truck",
  "Coupe",
  "Hatchback",
  "Wagon",
  "Van",
  "Convertible",
];

export const STATUS_OPTIONS = [
  "Serious Buyer",
  "Ready this month",
  "First-time buyer",
  "Just browsing",
];

export const TIMELINE_OPTIONS = [
  "This week",
  "This month",
  "1–3 months",
  "Just researching",
];

export const CONDITION_OPTIONS = ["New", "Used", "Certified", "Either"];

export const PAYMENT_OPTIONS = ["Finance", "Lease", "Cash", "Not sure"];

export const PREAPPROVED_OPTIONS = ["Pre-approved", "Will apply", "Paying cash"];

export const INTEREST_TAG_SUGGESTIONS = [
  "Dealer Maintained",
  "Certified Pre-Owned",
  "AWD",
  "Low kms",
  "One Owner",
  "No Accidents",
];

export const PREFERENCE_KINDS: {
  kind: PreferenceKind;
  title: string;
  hint: string;
  icon: IconName;
  color: string;
}[] = [
  { kind: "body", title: "Body style", hint: "SUV, truck, sedan…", icon: "car-sport-outline", color: "#0060F8" },
  { kind: "budget", title: "Price range", hint: "Min and max you're comfortable with", icon: "cash-outline", color: "#F87000" },
  { kind: "mileage", title: "Kilometres", hint: "How many kilometres is too many", icon: "speedometer-outline", color: "#0047C2" },
  { kind: "location", title: "Location", hint: "City or area you'll buy in", icon: "location-outline", color: "#0A1B4A" },
  { kind: "custom", title: "Something else", hint: "AWD, fuel type, seats…", icon: "add-circle-outline", color: "#3B82F6" },
];

export function preferenceMeta(kind: PreferenceKind) {
  return PREFERENCE_KINDS.find((item) => item.kind === kind) ?? PREFERENCE_KINDS[4];
}

function compactMoney(value: number) {
  if (value >= 1000) {
    const k = value / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return `$${value}`;
}

function compactKm(value: number) {
  if (value >= 1000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K km`;
  }
  return `${value} km`;
}

function odometerRange(pref: BuyerPreference) {
  return {
    min: pref.minKm ?? pref.minMiles,
    max: pref.maxKm ?? pref.maxMiles,
  };
}

export function formatPreference(pref: BuyerPreference) {
  if (pref.kind === "body") {
    return pref.bodyStyle || pref.label;
  }
  if (pref.kind === "budget") {
    if (pref.minPrice != null && pref.maxPrice != null) {
      return `${compactMoney(pref.minPrice)} – ${compactMoney(pref.maxPrice)}`;
    }
    if (pref.maxPrice != null) return `Under ${compactMoney(pref.maxPrice)}`;
    if (pref.minPrice != null) return `${compactMoney(pref.minPrice)}+`;
  }
  if (pref.kind === "mileage") {
    const { min, max } = odometerRange(pref);
    if (min != null && max != null) {
      return `${compactKm(min)} – ${compactKm(max)}`;
    }
    if (max != null) return `Under ${compactKm(max)}`;
    if (min != null) return `${compactKm(min)}+`;
  }
  if (pref.kind === "location") {
    const city = pref.city?.trim();
    if (city && pref.nearby) return `${city} & Nearby`;
    return city || pref.label;
  }
  return pref.customValue?.trim() || pref.label;
}

export function hasDiscoverableLocation(profile: Pick<BuyerProfile, "lat" | "lng" | "geohash">) {
  return profile.lat != null && profile.lng != null && !!profile.geohash;
}

export type SetupRequirement = {
  id: string;
  title: string;
  hint: string;
  href: "/profile-edit" | "/interest-edit";
};

/** Fields sellers need before this buyer should appear in nearby search. */
export function missingToBeFound(profile: BuyerProfile): SetupRequirement[] {
  const missing: SetupRequirement[] = [];
  if (!hasDiscoverableLocation(profile)) {
    missing.push({
      id: "location",
      title: "Add your location",
      hint: "Dealers search nearby buyers. Without a place, you won’t show up.",
      href: "/profile-edit",
    });
  }
  return missing;
}

export function isDiscoverable(profile: BuyerProfile) {
  return missingToBeFound(profile).length === 0;
}

export function interestTitle(interest: VehicleInterest) {
  return `${interest.make} ${interest.model}`.trim();
}

export function interestMeta(interest: VehicleInterest) {
  const years =
    interest.yearMin && interest.yearMax
      ? `${interest.yearMin}-${interest.yearMax}`
      : interest.yearMin
        ? `${interest.yearMin}+`
        : interest.yearMax
          ? `Up to ${interest.yearMax}`
          : null;
  return [years, interest.bodyStyle].filter(Boolean).join(" • ");
}

export const INTEREST_COLORS = [
  ["#0060F8", "#0047C2"],
  ["#F87000", "#C2410C"],
  ["#0A1B4A", "#06102A"],
  ["#3B82F6", "#1D4ED8"],
] as const;
