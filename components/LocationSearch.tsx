import { formStyles } from "@/components/FormScaffold";
import { colors, fonts } from "@/constants/theme";
import {
  resolvePlace,
  searchPlaces,
  type PlaceSuggestion,
  type ResolvedPlace,
} from "@/lib/places";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  value: string;
  placeholder?: string;
  onChangeText: (next: string) => void;
  onResolved: (place: ResolvedPlace | null) => void;
};

export function LocationSearch({ value, placeholder, onChangeText, onResolved }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [committed, setCommitted] = useState(value.trim());

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || query === committed) {
      setSuggestions([]);
      setError("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const next = await searchPlaces(query);
        if (!cancelled) {
          setSuggestions(next);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          setError(err instanceof Error ? err.message : "Could not search places.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [committed, value]);

  const pick = async (suggestion: PlaceSuggestion) => {
    setBusy(true);
    setError("");
    try {
      const place = await resolvePlace(suggestion);
      onChangeText(place.label);
      onResolved(place);
      setCommitted(place.label);
      setSuggestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load that place.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View>
        <TextInput
          style={formStyles.input}
          value={value}
          onChangeText={(next) => {
            onChangeText(next);
            onResolved(null);
            setCommitted("");
          }}
          placeholder={placeholder ?? "City, neighborhood, or address"}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {busy ? <ActivityIndicator style={styles.spinner} color={colors.brand} /> : null}
      </View>
      {suggestions.length ? (
        <View style={styles.list}>
          {suggestions.map((item) => (
            <TouchableOpacity key={item.id} style={styles.row} onPress={() => pick(item)} activeOpacity={0.75}>
              <Ionicons name="location-outline" size={18} color={colors.brand} />
              <View style={styles.copy}>
                <Text style={styles.label}>{item.label}</Text>
                {item.detail && item.detail !== item.label ? <Text style={styles.detail}>{item.detail}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: {
    position: "absolute",
    right: 14,
    top: 16,
  },
  list: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  detail: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
