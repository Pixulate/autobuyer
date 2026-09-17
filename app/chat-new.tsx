import { FormScaffold, formStyles } from "@/components/FormScaffold";
import { colors } from "@/constants/theme";
import { useChat } from "@/lib/chat";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity } from "react-native";

export default function ChatNewScreen() {
  const { findUserByEmail, openConversation } = useChat();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onStart = async () => {
    setError("");
    setBusy(true);
    try {
      const other = await findUserByEmail(email);
      if (!other) {
        setError("No Carloop account uses that email.");
        return;
      }
      const id = await openConversation(other);
      router.replace({ pathname: "/chat/[id]", params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start chat.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScaffold
      title="New chat"
      onClose={() => router.back()}
      footer={
        <TouchableOpacity style={formStyles.primaryBtn} onPress={onStart} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.onBrand} /> : <Text style={formStyles.primaryLabel}>Start encrypted chat</Text>}
        </TouchableOpacity>
      }
    >
      <Text style={formStyles.label}>Their Carloop email</Text>
      <TextInput
        style={formStyles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="dealer@example.com"
      />
      <Text style={formStyles.hint}>
        This looks them up inside Carloop. The thread is encrypted; it never shares your phone number.
      </Text>
      {error ? <Text style={formStyles.error}>{error}</Text> : null}
    </FormScaffold>
  );
}
