import { NativeModules, Platform } from "react-native";

export async function handoffToNativeCall(uuid = "") {
  if (Platform.OS === "web") return;
  try {
    const mod = NativeModules.CallHandoff;
    if (mod?.handoffToNativeCall) {
      await mod.handoffToNativeCall(uuid);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo-modules-core") as {
      requireNativeModule: (name: string) => { handoffToNativeCall: (uuid: string) => Promise<void> };
    };
    await requireNativeModule("CallHandoff").handoffToNativeCall(uuid);
  } catch (error) {
    console.warn("[Carloop] Could not hand off to native call UI", error);
  }
}
