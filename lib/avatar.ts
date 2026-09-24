import { reportError } from "@/lib/errors";
import { storage } from "@/lib/firebase";
import { requireOptionalNativeModule } from "expo-modules-core";
import { updateProfile, type User } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Alert } from "react-native";

type ImagePickerModule = typeof import("expo-image-picker");

function loadImagePicker(): ImagePickerModule | null {
  if (!requireOptionalNativeModule("ExponentImagePicker")) {
    return null;
  }
  return require("expo-image-picker") as ImagePickerModule;
}

function missingNativePicker() {
  Alert.alert(
    "Rebuild required",
    "Photo picking needs a new native build that includes expo-image-picker. Restart Metro after that rebuild."
  );
}

async function pick(source: "camera" | "library") {
  const ImagePicker = loadImagePicker();
  if (!ImagePicker) {
    missingNativePicker();
    return null;
  }

  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permission needed",
      source === "camera"
        ? "Allow camera access to take a profile photo."
        : "Allow photo access to choose a profile picture."
    );
    return null;
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }
  return result.assets[0].uri;
}

async function uploadAvatar(user: User, uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `buyers/${user.uid}/avatar.jpg`;
  const file = ref(storage, path);
  await uploadBytes(file, blob, { contentType: "image/jpeg" });
  const photoUrl = await getDownloadURL(file);
  try {
    await updateProfile(user, { photoURL: photoUrl });
  } catch {
    // Auth photo is optional; the buyer doc is the source of truth.
  }
  return photoUrl;
}

export function promptProfilePhoto(options: {
  hasPhoto: boolean;
  onPicked: (uri: string) => Promise<void>;
  onRemoved?: () => Promise<void>;
}) {
  const buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
    {
      text: "Take photo",
      onPress: () => {
        void pick("camera").then((uri) => uri && options.onPicked(uri));
      },
    },
    {
      text: "Choose photo",
      onPress: () => {
        void pick("library").then((uri) => uri && options.onPicked(uri));
      },
    },
  ];
  if (options.hasPhoto && options.onRemoved) {
    buttons.push({
      text: "Remove photo",
      style: "destructive",
      onPress: () => {
        void options.onRemoved?.();
      },
    });
  }
  buttons.push({ text: "Cancel", style: "cancel" });
  Alert.alert("Profile photo", "Dealers see this on your buyer card.", buttons);
}

export async function saveProfilePhoto(user: User, uri: string) {
  try {
    return await uploadAvatar(user, uri);
  } catch (error) {
    reportError("Uploading profile photo", error);
    throw error;
  }
}
