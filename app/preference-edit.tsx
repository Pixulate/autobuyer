import { FormScaffold, formStyles } from "@/components/FormScaffold";
import { LocationSearch } from "@/components/LocationSearch";
import { colors, fonts } from "@/constants/theme";
import {
  BODY_STYLES,
  formatPreference,
  newId,
  PREFERENCE_KINDS,
  preferenceMeta,
  type BuyerPreference,
  type PreferenceKind,
} from "@/lib/buyer";
import { useBuyer } from "@/lib/buyerProfile";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function parseNumber(value: string) {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return undefined;
  return Number(cleaned);
}

export default function PreferenceEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile, upsertPreference, removePreference } = useBuyer();
  const existing = useMemo(
    () => profile.preferences.find((item) => item.id === id),
    [id, profile.preferences]
  );

  const [kind, setKind] = useState<PreferenceKind | null>(existing?.kind ?? null);
  const [bodyStyle, setBodyStyle] = useState(existing?.bodyStyle ?? "");
  const [minPrice, setMinPrice] = useState(existing?.minPrice != null ? String(existing.minPrice) : "");
  const [maxPrice, setMaxPrice] = useState(existing?.maxPrice != null ? String(existing.maxPrice) : "");
  const [minKm, setMinKm] = useState(
    existing?.minKm != null ? String(existing.minKm) : existing?.minMiles != null ? String(existing.minMiles) : ""
  );
  const [maxKm, setMaxKm] = useState(
    existing?.maxKm != null ? String(existing.maxKm) : existing?.maxMiles != null ? String(existing.maxMiles) : ""
  );
  const [city, setCity] = useState(existing?.city ?? profile.location);
  const [nearby, setNearby] = useState(existing?.nearby ?? true);
  const [customValue, setCustomValue] = useState(existing?.customValue ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const title = existing ? "Edit preference" : "Add preference";

  const buildPreference = (): BuyerPreference | null => {
    if (!kind) return null;
    const pref: BuyerPreference = {
      id: existing?.id ?? newId(),
      kind,
      label: "",
      bodyStyle: bodyStyle.trim() || undefined,
      minPrice: parseNumber(minPrice),
      maxPrice: parseNumber(maxPrice),
      minKm: parseNumber(minKm),
      maxKm: parseNumber(maxKm),
      minMiles: undefined,
      maxMiles: undefined,
      city: city.trim() || undefined,
      nearby: kind === "location" ? nearby : undefined,
      customValue: customValue.trim() || undefined,
    };
    pref.label = formatPreference(pref);
    return pref;
  };

  const onSave = async () => {
    const pref = buildPreference();
    if (!kind || !pref) {
      setError("Pick what kind of preference this is.");
      return;
    }
    if (kind === "body" && !pref.bodyStyle) {
      setError("Choose or type a body style.");
      return;
    }
    if (kind === "budget" && pref.minPrice == null && pref.maxPrice == null) {
      setError("Add a minimum, maximum, or both.");
      return;
    }
    if (kind === "mileage" && pref.minKm == null && pref.maxKm == null) {
      setError("Add a kilometre cap or range.");
      return;
    }
    if (kind === "location" && !pref.city) {
      setError("Add a city or area.");
      return;
    }
    if (kind === "custom" && !pref.customValue) {
      setError("Write the preference.");
      return;
    }
    pref.label = formatPreference(pref);
    setBusy(true);
    setError("");
    try {
      await upsertPreference(pref);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save preference.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert("Remove preference", "This will come off your profile.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removePreference(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <FormScaffold
      title={title}
      onClose={() => router.back()}
      footer={
        kind ? (
          <View>
            <TouchableOpacity style={formStyles.primaryBtn} onPress={onSave} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={formStyles.primaryLabel}>Save</Text>}
            </TouchableOpacity>
            {existing ? (
              <TouchableOpacity style={formStyles.dangerBtn} onPress={onDelete}>
                <Text style={formStyles.dangerLabel}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null
      }
    >
      {!kind ? (
        <View>
          <Text style={styles.intro}>What should dealers know about what you want?</Text>
          {PREFERENCE_KINDS.map((item) => (
            <TouchableOpacity key={item.kind} style={styles.kindRow} onPress={() => setKind(item.kind)} activeOpacity={0.8}>
              <View style={[styles.kindIcon, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.kindCopy}>
                <Text style={styles.kindTitle}>{item.title}</Text>
                <Text style={styles.kindHint}>{item.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View>
          <TouchableOpacity onPress={() => !existing && setKind(null)} disabled={!!existing}>
            <Text style={styles.kindBadge}>{preferenceMeta(kind).title}</Text>
          </TouchableOpacity>

          {kind === "body" ? (
            <>
              <View style={formStyles.chips}>
                {BODY_STYLES.map((style) => {
                  const on = bodyStyle === style;
                  return (
                    <TouchableOpacity
                      key={style}
                      style={[formStyles.chip, on && formStyles.chipOn]}
                      onPress={() => setBodyStyle(style)}
                    >
                      <Text style={[formStyles.chipText, on && formStyles.chipTextOn]}>{style}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[formStyles.input, { marginTop: 10 }]}
                value={bodyStyle}
                onChangeText={setBodyStyle}
                placeholder="Or type one, like Sportback"
              />
            </>
          ) : null}

          {kind === "budget" ? (
            <>
              <View style={formStyles.row}>
                <TextInput
                  style={[formStyles.input, formStyles.flex]}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="number-pad"
                  placeholder="Min $"
                />
                <TextInput
                  style={[formStyles.input, formStyles.flex]}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="number-pad"
                  placeholder="Max $"
                />
              </View>
              <Text style={formStyles.hint}>Leave one blank for “under” or “and up”.</Text>
            </>
          ) : null}

          {kind === "mileage" ? (
            <>
              <View style={formStyles.row}>
                <TextInput
                  style={[formStyles.input, formStyles.flex]}
                  value={minKm}
                  onChangeText={setMinKm}
                  keyboardType="number-pad"
                  placeholder="Min km"
                />
                <TextInput
                  style={[formStyles.input, formStyles.flex]}
                  value={maxKm}
                  onChangeText={setMaxKm}
                  keyboardType="number-pad"
                  placeholder="Max km"
                />
              </View>
              <Text style={formStyles.hint}>Most buyers only fill in a max, like 120000.</Text>
            </>
          ) : null}

          {kind === "location" ? (
            <>
              <Text style={formStyles.label}>City or area</Text>
              <LocationSearch
                value={city}
                onChangeText={setCity}
                onResolved={(next) => {
                  if (next) setCity(next.city || next.label);
                }}
                placeholder="City or neighborhood"
              />
              <TouchableOpacity style={styles.toggle} onPress={() => setNearby(!nearby)} activeOpacity={0.8}>
                <Ionicons
                  name={nearby ? "checkbox" : "square-outline"}
                  size={22}
                  color={nearby ? colors.primary : colors.textMuted}
                />
                <Text style={styles.toggleLabel}>Include nearby areas</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {kind === "custom" ? (
            <>
              <Text style={formStyles.label}>Preference</Text>
              <TextInput
                style={formStyles.input}
                value={customValue}
                onChangeText={setCustomValue}
                placeholder="AWD, 7 seats, hybrid…"
              />
            </>
          ) : null}

          {error ? <Text style={formStyles.error}>{error}</Text> : null}
        </View>
      )}
    </FormScaffold>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  kindIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  kindCopy: {
    flex: 1,
  },
  kindTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  kindHint: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  kindBadge: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.primary,
    marginBottom: 12,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  toggleLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
});
