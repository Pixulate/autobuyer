import { BrandLogo } from "@/components/ScreenHeader";
import { globalStyles } from "@/app/_layout";
import { onboardingStyles } from "@/app/(onboarding)/onboarding";
import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { reportError } from "@/lib/errors";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function authMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-email")) return "Enter a valid email.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Email or password is incorrect.";
  }
  if (code.includes("email-already-in-use")) return "That email already has an account.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("too-many-requests")) return "Too many attempts. Try again in a moment.";
  return "Could not sign in. Try again.";
}

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("Add your name so dealers know who you are.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      reportError(mode === "login" ? "Logging in" : "Creating account", err, { alert: false });
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ width: "100%", height: "100%", backgroundColor: colors.background }}>
      <SafeAreaView style={onboardingStyles.onboardingPage}>
        <View
          style={{
            width: "100%",
            marginBottom: 30,
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <BrandLogo height={28} />
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ width: "100%", flex: 1, justifyContent: "center" }}>
            <Text style={[globalStyles.funnelExtraBold, { textAlign: "center", fontSize: 30, marginBottom: 24 }]}>
              {mode === "login" ? "Welcome back" : "Create your buyer account"}
            </Text>

            {mode === "register" ? (
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === "login" ? "password" : "new-password"}
            />

            {error ? (
              <Text style={[globalStyles.h5, { color: "#EF4444", textAlign: "center", marginBottom: 8 }]}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={onboardingStyles.footer}>
            <TouchableOpacity style={onboardingStyles.nextButton} onPress={onSubmit} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[globalStyles.h3, { color: "white" }]}>
                  {mode === "login" ? "Log in" : "Create account"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setError("");
                setMode(mode === "login" ? "register" : "login");
              }}
            >
              <Text style={[globalStyles.h4, { fontSize: 15, textAlign: "center", marginTop: 15 }]}>
                {mode === "login" ? "Need an account?" : "Already have an account?"}
                <Text style={{ color: colors.accent }}>
                  {mode === "login" ? " Create one" : " Log in"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    width: "100%",
    flex: 1,
  },
  input: {
    width: "100%",
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontFamily: "400",
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#FFFFFF",
  },
});
