import { Alert, Platform } from "react-native";

const logged = new Set<string>();

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

export function isPermissionError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  const message = errorMessage(error).toLowerCase();
  return (
    code === "permission-denied" ||
    message.includes("missing or insufficient") ||
    message.includes("permission-denied")
  );
}

export function reportError(context: string, error: unknown, opts?: { alert?: boolean }) {
  const message = errorMessage(error);
  const permission = isPermissionError(error);
      console.error(`[Carloop] ${context}`, error);
  if (permission) {
    console.error(
      `[Carloop] Firestore denied "${context}". Deploy firestore.rules (buyers, conversations, calls, users).`
    );
  }

  const shouldAlert = opts?.alert ?? permission;
  const key = `${context}:${message}`;
  if (shouldAlert && !logged.has(key)) {
    logged.add(key);
    const title = permission ? "Missing permissions" : "Something went wrong";
    const copy = permission
      ? `${context}\n\n${message}\n\nThe app needs Firestore rules that allow this signed-in user to read/write their own buyer profile, chats, and calls.`
      : `${context}\n\n${message}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}\n\n${copy}`);
    } else {
      Alert.alert(title, copy);
    }
  }
}
