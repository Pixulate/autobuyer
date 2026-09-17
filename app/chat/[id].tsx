import { colors, fonts } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useCall } from "@/lib/calling";
import { listenMessages, sendEncryptedMessage, useChat, type ChatMessage } from "@/lib/chat";
import { decryptText } from "@/lib/crypto";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, convKeyFor, otherName } = useChat();
  const { startCall } = useCall();
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [peerToken, setPeerToken] = useState<string | undefined>();

  const conv = conversations.find((item) => item.id === id);
  const convKey = conv ? convKeyFor(conv) : null;
  const title = user && conv ? otherName(conv, user.uid) : "Chat";
  const peerId = conv?.users.find((uid) => uid !== user?.uid);

  useEffect(() => {
    if (!id || !user) return;
    return listenMessages(id, user.uid, setRows);
  }, [id, user]);

  useEffect(() => {
    if (!peerId) return;
    getDoc(doc(db, "users", peerId)).then((snap) => {
      setPeerToken(snap.data()?.expoPushToken);
    });
  }, [peerId]);

  const decrypted = useMemo(() => {
    return rows.map((row) => {
      if (row.ciphertext && row.nonce && convKey) {
        try {
          return { ...row, body: decryptText(row.nonce, row.ciphertext, convKey) };
        } catch {
          return { ...row, body: "Unable to decrypt" };
        }
      }
      return { ...row, body: row.text || "" };
    });
  }, [convKey, rows]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text || !user || !id || !convKey) return;
    setDraft("");
    await sendEncryptedMessage({
      conversationId: id,
      senderId: user.uid,
      users: conv?.users ?? [user.uid],
      convKey,
      text,
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => {
            if (!peerId || !id) return;
            startCall({
              calleeId: peerId,
              calleeName: title,
              conversationId: id,
              calleePushToken: peerToken,
            });
          }}
        >
          <Ionicons name="call-outline" size={20} color={colors.brandInk} />
        </TouchableOpacity>
      </View>
      <Text style={styles.e2e}>End-to-end encrypted · keys stay on this device</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
          {decrypted.map((row) => {
            const mine = row.senderId === user?.uid;
            return (
              <View key={row.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.body, mine && { color: colors.onBrand }]}>{row.body}</Text>
              </View>
            );
          })}
        </ScrollView>
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={convKey ? "Message" : "Waiting for encryption keys…"}
            editable={!!convKey}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.send} onPress={onSend} disabled={!convKey}>
            <Ionicons name="send" size={18} color={colors.onBrand} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
  },
  e2e: {
    textAlign: "center",
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
  },
  thread: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
