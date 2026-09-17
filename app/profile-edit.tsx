import { FormScaffold, formStyles } from "@/components/FormScaffold";
import { colors, fonts } from "@/constants/theme";
import { promptProfilePhoto } from "@/lib/avatar";
import {
  CONDITION_OPTIONS,
  PAYMENT_OPTIONS,
  PREAPPROVED_OPTIONS,
  STATUS_OPTIONS,
  TIMELINE_OPTIONS,
} from "@/lib/buyer";
import { useBuyer } from "@/lib/buyerProfile";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={formStyles.chips}>
      {options.map((option) => {
        const on = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={[formStyles.chip, on && formStyles.chipOn]}
            onPress={() => onChange(on ? "" : option)}
          >
            <Text style={[formStyles.chipText, on && formStyles.chipTextOn]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ProfileEditScreen() {
  const { profile, saveProfile, setPhoto, removePhoto } = useBuyer();
  const [name, setName] = useState(profile.name);
  const [status, setStatus] = useState(profile.status);
  const [location, setLocation] = useState(profile.location);
  const [bio, setBio] = useState(profile.bio);
  const [timeline, setTimeline] = useState(profile.timeline);
  const [condition, setCondition] = useState(profile.condition);
  const [payment, setPayment] = useState(profile.payment);
  const [currentVehicle, setCurrentVehicle] = useState(profile.currentVehicle);
  const [preapproved, setPreapproved] = useState(profile.preapproved);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    if (!name.trim()) {
      setError("Add your name so dealers know who you are.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveProfile({
        name: name.trim(),
        status: status.trim(),
        location: location.trim(),
        bio: bio.trim(),
        timeline,
        condition,
        payment,
        currentVehicle: currentVehicle.trim(),
        preapproved,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScaffold
      title="Edit profile"
      onClose={() => router.back()}
      footer={
        <TouchableOpacity style={formStyles.primaryBtn} onPress={onSave} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={formStyles.primaryLabel}>Save</Text>}
        </TouchableOpacity>
      }
    >
      <Text style={formStyles.label}>Photo</Text>
      <TouchableOpacity
        style={styles.photoRow}
        activeOpacity={0.8}
        onPress={() =>
          promptProfilePhoto({
            hasPhoto: !!profile.photoUrl,
            onPicked: async (uri) => {
              setBusy(true);
              try {
                await setPhoto(uri);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not upload photo.");
              } finally {
                setBusy(false);
              }
            },
            onRemoved: () => removePhoto(),
          })
        }
      >
        <View style={styles.photo}>
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={styles.photoImage} contentFit="cover" />
          ) : (
            <Ionicons name="person" size={28} color={colors.brand} />
          )}
        </View>
        <Text style={styles.photoLabel}>{profile.photoUrl ? "Change photo" : "Add a photo"}</Text>
      </TouchableOpacity>

      <Text style={formStyles.label}>Name</Text>
      <TextInput style={formStyles.input} value={name} onChangeText={setName} placeholder="Your name" />

      <Text style={formStyles.label}>Headline</Text>
      <ChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      <TextInput
        style={[formStyles.input, { marginTop: 10 }]}
        value={status}
        onChangeText={setStatus}
        placeholder="Or write your own"
      />

      <Text style={formStyles.label}>Location</Text>
      <TextInput
        style={formStyles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="Los Angeles, CA"
      />

      <Text style={formStyles.label}>About</Text>
      <TextInput
        style={[formStyles.input, formStyles.textarea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Who you are as a buyer — commute, family, must-haves. Dealers see this, not your phone or email."
        multiline
      />

      <Text style={formStyles.label}>How soon</Text>
      <ChipRow options={TIMELINE_OPTIONS} value={timeline} onChange={setTimeline} />

      <Text style={formStyles.label}>New or used</Text>
      <ChipRow options={CONDITION_OPTIONS} value={condition} onChange={setCondition} />

      <Text style={formStyles.label}>How you'll pay</Text>
      <ChipRow options={PAYMENT_OPTIONS} value={payment} onChange={setPayment} />

      <Text style={formStyles.label}>Financing</Text>
      <ChipRow options={PREAPPROVED_OPTIONS} value={preapproved} onChange={setPreapproved} />

      <Text style={formStyles.label}>Current vehicle / trade-in</Text>
      <TextInput
        style={formStyles.input}
        value={currentVehicle}
        onChangeText={setCurrentVehicle}
        placeholder="2018 Honda CR-V, or leave blank"
      />
      <Text style={formStyles.hint}>Salespeople use this to structure a trade. Skip if you don't have one.</Text>

      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormScaffold>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.brand,
  },
});

