import { FormScaffold, formStyles } from "@/components/FormScaffold";
import { colors } from "@/constants/theme";
import { BODY_STYLES, INTEREST_TAG_SUGGESTIONS, newId, type VehicleInterest } from "@/lib/buyer";
import { useBuyer } from "@/lib/buyerProfile";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function parseYear(value: string) {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return undefined;
  return Number(cleaned);
}

export default function InterestEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile, upsertInterest, removeInterest } = useBuyer();
  const existing = useMemo(
    () => profile.interests.find((item) => item.id === id),
    [id, profile.interests]
  );

  const [make, setMake] = useState(existing?.make ?? "");
  const [model, setModel] = useState(existing?.model ?? "");
  const [yearMin, setYearMin] = useState(existing?.yearMin != null ? String(existing.yearMin) : "");
  const [yearMax, setYearMax] = useState(existing?.yearMax != null ? String(existing.yearMax) : "");
  const [bodyStyle, setBodyStyle] = useState(existing?.bodyStyle ?? "");
  const [color, setColor] = useState(existing?.color ?? "");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const addTag = (value: string) => {
    const next = value.trim();
    if (!next || tags.includes(next)) return;
    setTags([...tags, next]);
    setTagDraft("");
  };

  const onSave = async () => {
    if (!make.trim() || !model.trim()) {
      setError("Make and model are required.");
      return;
    }
    const interest: VehicleInterest = {
      id: existing?.id ?? newId(),
      make: make.trim(),
      model: model.trim(),
      yearMin: parseYear(yearMin),
      yearMax: parseYear(yearMax),
      bodyStyle: bodyStyle.trim() || undefined,
      color: color.trim() || undefined,
      tags,
    };
    setBusy(true);
    setError("");
    try {
      await upsertInterest(interest);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this interest.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert("Remove interest", "Dealers will no longer see this vehicle.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeInterest(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <FormScaffold
      title={existing ? "Edit interest" : "Vehicle interest"}
      onClose={() => router.back()}
      footer={
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
      }
    >
      <Text style={formStyles.label}>Make</Text>
      <TextInput style={formStyles.input} value={make} onChangeText={setMake} placeholder="BMW" autoCapitalize="words" />

      <Text style={formStyles.label}>Model</Text>
      <TextInput style={formStyles.input} value={model} onChangeText={setModel} placeholder="X5" autoCapitalize="words" />

      <Text style={formStyles.label}>Years</Text>
      <View style={formStyles.row}>
        <TextInput
          style={[formStyles.input, formStyles.flex]}
          value={yearMin}
          onChangeText={setYearMin}
          keyboardType="number-pad"
          placeholder="From"
        />
        <TextInput
          style={[formStyles.input, formStyles.flex]}
          value={yearMax}
          onChangeText={setYearMax}
          keyboardType="number-pad"
          placeholder="To"
        />
      </View>

      <Text style={formStyles.label}>Body style</Text>
      <View style={formStyles.chips}>
        {BODY_STYLES.map((style) => {
          const on = bodyStyle === style;
          return (
            <TouchableOpacity
              key={style}
              style={[formStyles.chip, on && formStyles.chipOn]}
              onPress={() => setBodyStyle(on ? "" : style)}
            >
              <Text style={[formStyles.chipText, on && formStyles.chipTextOn]}>{style}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={formStyles.label}>Color</Text>
      <TextInput
        style={formStyles.input}
        value={color}
        onChangeText={setColor}
        placeholder="Any color, white, black…"
      />

      <Text style={formStyles.label}>Must-haves</Text>
      <View style={formStyles.chips}>
        {INTEREST_TAG_SUGGESTIONS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[formStyles.chip, on && formStyles.chipOn]}
              onPress={() => setTags(on ? tags.filter((item) => item !== tag) : [...tags, tag])}
            >
              <Text style={[formStyles.chipText, on && formStyles.chipTextOn]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
        {tags
          .filter((tag) => !INTEREST_TAG_SUGGESTIONS.includes(tag))
          .map((tag) => (
            <TouchableOpacity key={tag} style={[formStyles.chip, formStyles.chipOn]} onPress={() => setTags(tags.filter((item) => item !== tag))}>
              <Text style={[formStyles.chipText, formStyles.chipTextOn]}>{tag}</Text>
            </TouchableOpacity>
          ))}
      </View>
      <View style={[formStyles.row, { marginTop: 10, alignItems: "center" }]}>
        <TextInput
          style={[formStyles.input, formStyles.flex]}
          value={tagDraft}
          onChangeText={setTagDraft}
          placeholder="Add your own"
          onSubmitEditing={() => addTag(tagDraft)}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={() => addTag(tagDraft)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormScaffold>
  );
}
