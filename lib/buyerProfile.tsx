import { saveProfilePhoto } from "@/lib/avatar";
import { displayNameFor, useAuth } from "@/lib/auth";
import { emptyProfile, isDiscoverable, type BuyerPreference, type BuyerProfile, type VehicleInterest } from "@/lib/buyer";
import { db } from "@/lib/firebase";
import { reportError } from "@/lib/errors";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type BuyerContextValue = {
  profile: BuyerProfile;
  loading: boolean;
  error: string;
  saveProfile: (next: Partial<BuyerProfile>) => Promise<void>;
  setPhoto: (uri: string) => Promise<void>;
  removePhoto: () => Promise<void>;
  upsertPreference: (pref: BuyerPreference) => Promise<void>;
  removePreference: (id: string) => Promise<void>;
  upsertInterest: (interest: VehicleInterest) => Promise<void>;
  removeInterest: (id: string) => Promise<void>;
};

const BuyerContext = createContext<BuyerContextValue | null>(null);

function str(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function num(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strings(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseProfile(data: Record<string, unknown> | undefined, fallbackName: string): BuyerProfile {
  const base = emptyProfile(fallbackName);
  if (!data) {
    return base;
  }
  return {
    name: str(data, "name").trim() ? str(data, "name") : fallbackName,
    status: str(data, "status"),
    location: str(data, "location"),
    placeId: str(data, "placeId"),
    lat: num(data, "lat"),
    lng: num(data, "lng"),
    geohash: str(data, "geohash"),
    geohashPrefixes: strings(data, "geohashPrefixes"),
    locationCity: str(data, "locationCity"),
    locationRegion: str(data, "locationRegion"),
    locationCountry: str(data, "locationCountry"),
    locationPostal: str(data, "locationPostal"),
    bio: str(data, "bio"),
    timeline: str(data, "timeline"),
    condition: str(data, "condition"),
    payment: str(data, "payment"),
    currentVehicle: str(data, "currentVehicle"),
    preapproved: str(data, "preapproved"),
    photoUrl: str(data, "photoUrl") || str(data, "photoURL"),
    preferences: Array.isArray(data.preferences) ? (data.preferences as BuyerPreference[]) : [],
    interests: Array.isArray(data.interests)
      ? (data.interests as VehicleInterest[]).map((item) => ({
          ...item,
          tags: item.tags ?? [],
        }))
      : [],
  };
}

export function BuyerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BuyerProfile>(emptyProfile());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setProfile(emptyProfile());
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "buyers", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(parseProfile(snap.data(), displayNameFor(user)));
        setError("");
        setLoading(false);
      },
      (err) => {
        reportError("Loading buyer profile", err);
        setError(err.message);
        setProfile(emptyProfile(displayNameFor(user)));
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const persist = useCallback(
    async (next: BuyerProfile) => {
      if (!user) {
        throw new Error("Not signed in");
      }
      const cleaned: BuyerProfile = JSON.parse(JSON.stringify(next));
      try {
        await setDoc(
          doc(db, "buyers", user.uid),
          {
            ...cleaned,
            uid: user.uid,
            email: user.email ?? "",
            discoverable: isDiscoverable(cleaned),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        reportError("Saving buyer profile", error);
        throw error;
      }
      if (cleaned.name && cleaned.name !== user.displayName) {
        await updateProfile(user, { displayName: cleaned.name });
      }
    },
    [user]
  );

  const saveProfile = useCallback(
    async (partial: Partial<BuyerProfile>) => {
      const next = { ...profile, ...partial };
      setProfile(next);
      await persist(next);
    },
    [persist, profile]
  );

  const setPhoto = useCallback(
    async (uri: string) => {
      if (!user) {
        throw new Error("Not signed in");
      }
      const photoUrl = await saveProfilePhoto(user, uri);
      await saveProfile({ photoUrl });
    },
    [saveProfile, user]
  );

  const removePhoto = useCallback(async () => {
    await saveProfile({ photoUrl: "" });
  }, [saveProfile]);

  const upsertPreference = useCallback(
    async (pref: BuyerPreference) => {
      const existing = profile.preferences.some((item) => item.id === pref.id);
      const preferences = existing
        ? profile.preferences.map((item) => (item.id === pref.id ? pref : item))
        : [...profile.preferences, pref];
      const next = { ...profile, preferences };
      setProfile(next);
      await persist(next);
    },
    [persist, profile]
  );

  const removePreference = useCallback(
    async (id: string) => {
      const next = { ...profile, preferences: profile.preferences.filter((item) => item.id !== id) };
      setProfile(next);
      await persist(next);
    },
    [persist, profile]
  );

  const upsertInterest = useCallback(
    async (interest: VehicleInterest) => {
      const existing = profile.interests.some((item) => item.id === interest.id);
      const interests = existing
        ? profile.interests.map((item) => (item.id === interest.id ? interest : item))
        : [...profile.interests, interest];
      const next = { ...profile, interests };
      setProfile(next);
      await persist(next);
    },
    [persist, profile]
  );

  const removeInterest = useCallback(
    async (id: string) => {
      const next = { ...profile, interests: profile.interests.filter((item) => item.id !== id) };
      setProfile(next);
      await persist(next);
    },
    [persist, profile]
  );

  const value = useMemo(
    () => ({
      profile,
      loading,
      error,
      saveProfile,
      setPhoto,
      removePhoto,
      upsertPreference,
      removePreference,
      upsertInterest,
      removeInterest,
    }),
    [profile, loading, error, saveProfile, setPhoto, removePhoto, upsertPreference, removePreference, upsertInterest, removeInterest]
  );

  return <BuyerContext.Provider value={value}>{children}</BuyerContext.Provider>;
}

export function useBuyer() {
  const ctx = useContext(BuyerContext);
  if (!ctx) {
    throw new Error("useBuyer must be used inside BuyerProvider");
  }
  return ctx;
}
