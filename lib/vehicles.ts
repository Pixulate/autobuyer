import { reportError } from "@/lib/errors";
import { db } from "@/lib/firebase";
import { distanceKm, geohashesForRadius } from "@/lib/geohash";
import { collection, doc, getDoc, limit, onSnapshot, query, where, type Timestamp } from "firebase/firestore";

export const NEARBY_OFFER_KM = 80;

export type OfferedVehicle = {
  id: string;
  title: string;
  detail: string;
  priceLabel: string;
  dealer: string;
  photo?: string;
  photos: string[];
  make: string;
  model: string;
  year: string;
  km: number | null;
  bodyStyle: string;
  price: number;
  lat: number | null;
  lng: number | null;
};

export function priceLabel(value: number) {
  if (!Number.isFinite(value)) return "";
  return `$${Math.round(value).toLocaleString()}`;
}

function money(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return priceLabel(n);
}

function formatKm(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  if (n >= 1000) return `${Math.round(n / 1000)}K km`;
  return `${n} km`;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseVehicle(id: string, data: Record<string, unknown>): OfferedVehicle {
  const make = typeof data.make === "string" ? data.make : "";
  const model = typeof data.model === "string" ? data.model : "";
  const year = data.year != null ? String(data.year) : "";
  const title =
    (typeof data.title === "string" && data.title) ||
    [year, make, model].filter(Boolean).join(" ") ||
    "Vehicle";
  const photos = Array.isArray(data.photos) ? data.photos : Array.isArray(data.images) ? data.images : [];
  const photo =
    (typeof data.photo === "string" && data.photo) ||
    (typeof data.imageUrl === "string" && data.imageUrl) ||
    (typeof photos[0] === "string" ? photos[0] : undefined);
  const dealer =
    (typeof data.dealerName === "string" && data.dealerName) ||
    (typeof data.sellerName === "string" && data.sellerName) ||
    "Dealership";
  const body = typeof data.bodyStyle === "string" ? data.bodyStyle : typeof data.body === "string" ? data.body : "";
  const km = num(data.km) ?? num(data.mileage) ?? num(data.miles);
  const photoList = [
    ...(typeof photo === "string" && photo ? [photo] : []),
    ...photos.filter((item): item is string => typeof item === "string" && item !== photo),
  ];
  const detail = [formatKm(km), body].filter(Boolean).join(" • ");
  const price = typeof data.price === "number" ? data.price : Number(data.price) || Number(data.askingPrice) || 0;
  return {
    id,
    title,
    detail,
    priceLabel: money(price),
    dealer,
    photo: photoList[0] || photo,
    photos: photoList,
    make,
    model,
    year,
    km,
    bodyStyle: body,
    price,
    lat: num(data.lat),
    lng: num(data.lng),
  };
}

function createdMs(data: Record<string, unknown>) {
  const created = (data.offeredAt as Timestamp | undefined) ?? (data.createdAt as Timestamp | undefined);
  return created?.toMillis?.() ?? 0;
}

function stillLive(data: Record<string, unknown>) {
  const expire = data.expireAt as Timestamp | undefined;
  const ms = expire?.toMillis?.();
  return !ms || ms > Date.now();
}

function toRows(
  docs: { id: string; data: Record<string, unknown> }[],
  origin: { lat: number; lng: number } | null
) {
  return docs
    .filter((item) => stillLive(item.data))
    .filter((item) => {
      if (!origin) return true;
      const lat = num(item.data.lat);
      const lng = num(item.data.lng);
      if (lat == null || lng == null) return false;
      return distanceKm(origin.lat, origin.lng, lat, lng) <= NEARBY_OFFER_KM;
    })
    .sort((a, b) => createdMs(b.data) - createdMs(a.data))
    .slice(0, 8)
    .map((item) => parseVehicle(item.id, item.data));
}

export function listenRecentVehicles(
  origin: { lat: number; lng: number } | null,
  onRows: (rows: OfferedVehicle[]) => void
) {
  if (!origin) {
    onRows([]);
    return () => {};
  }

  const q = query(
    collection(db, "vehicles"),
    where("geohashPrefixes", "array-contains-any", geohashesForRadius(origin.lat, origin.lng, NEARBY_OFFER_KM)),
    limit(40)
  );

  return onSnapshot(
    q,
    (snap) => {
      onRows(
        toRows(
          snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> })),
          origin
        )
      );
    },
    (error) => {
      reportError("Loading offered vehicles", error, { alert: false });
      onRows([]);
    }
  );
}

export async function getOfferedVehicle(id: string) {
  const snap = await getDoc(doc(db, "vehicles", id));
  if (!snap.exists()) return null;
  return parseVehicle(snap.id, snap.data() as Record<string, unknown>);
}
