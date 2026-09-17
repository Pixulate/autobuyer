import { db } from "@/lib/firebase";
import { reportError } from "@/lib/errors";
import { collection, limit, onSnapshot, query, type Timestamp } from "firebase/firestore";

export type OfferedVehicle = {
  id: string;
  title: string;
  detail: string;
  priceLabel: string;
  dealer: string;
  photo?: string;
};

function money(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return `$${Math.round(n).toLocaleString()}`;
}

function miles(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  if (n >= 1000) return `${Math.round(n / 1000)}K mi`;
  return `${n} mi`;
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
  const body = typeof data.bodyStyle === "string" ? data.bodyStyle : "";
  const detail = [miles(data.mileage ?? data.miles ?? data.km), body].filter(Boolean).join(" • ");
  return {
    id,
    title,
    detail,
    priceLabel: money(data.price ?? data.askingPrice),
    dealer,
    photo,
  };
}

function createdMs(data: Record<string, unknown>) {
  const created = data.createdAt as Timestamp | undefined;
  return created?.toMillis?.() ?? 0;
}

export function listenRecentVehicles(onRows: (rows: OfferedVehicle[]) => void) {
  const q = query(collection(db, "vehicles"), limit(24));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((item) => ({ doc: item, data: item.data() as Record<string, unknown> }))
        .sort((a, b) => createdMs(b.data) - createdMs(a.data))
        .slice(0, 8)
        .map((item) => parseVehicle(item.doc.id, item.data));
      onRows(rows);
    },
    (error) => {
      reportError("Loading offered vehicles", error, { alert: false });
      onRows([]);
    }
  );
}
