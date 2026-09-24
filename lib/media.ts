import { reportError } from "@/lib/errors";
import { storage } from "@/lib/firebase";
import { requireOptionalNativeModule } from "expo-modules-core";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Alert } from "react-native";

type ImagePickerModule = typeof import("expo-image-picker");

function loadImagePicker(): ImagePickerModule | null {
  try {
    if (!requireOptionalNativeModule("ExponentImagePicker")) {
      return null;
    }
    return require("expo-image-picker") as ImagePickerModule;
  } catch {
    return null;
  }
}

export async function pickImage(opts?: { square?: boolean }) {
  const ImagePicker = loadImagePicker();
  if (!ImagePicker) {
    Alert.alert("Rebuild required", "Photo picking needs a native build with expo-image-picker.");
    return null;
  }
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission needed", "Allow photo access to attach an image.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: opts?.square === true,
    aspect: opts?.square ? [1, 1] : undefined,
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

export async function uploadImage(path: string, uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const file = ref(storage, path);
  await uploadBytes(file, blob, { contentType: "image/jpeg" });
  return getDownloadURL(file);
}

export async function uploadChatImage(conversationId: string, uri: string) {
  try {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    return await uploadImage(`chats/${conversationId}/${id}.jpg`, uri);
  } catch (error) {
    reportError("Uploading chat photo", error);
    throw error;
  }
}
