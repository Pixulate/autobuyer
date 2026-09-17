import { TAB_BAR_HEIGHT } from "@/components/AppTabBar";
import { IconButton, ScreenHeader, TabHeaderFrame } from "@/components/ScreenHeader";
import { colors, fonts } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useChat } from "@/lib/chat";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, loading, otherName } = useChat();

  return (
    <View style={styles.screen}>
      <TabHeaderFrame>
        <ScreenHeader
          title="Inbox"
          lede="End-to-end encrypted on this device. Dealers never see your phone or email in the thread."
          right={
            <IconButton onPress={() => router.push("/chat-new")}>
              <Ionicons name="create-outline" size={20} color={colors.brandInk} />
            </IconButton>
          }
        />
      </TabHeaderFrame>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: TAB_BAR_HEIGHT + insets.bottom,
        }}
      >
        {!conversations.length ? (
          <View style={styles.empty}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.brandInk} />
            </View>
            <Text style={styles.emptyTitle}>{loading ? "Loading chats…" : "No conversations yet"}</Text>
            <Text style={styles.emptyCopy}>
              When a dealer unlocks an interest, the thread appears here. You can also start a secure chat if you already have their Carloop email.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {conversations.map((conv, index) => (
              <TouchableOpacity
                key={conv.id}
                style={[styles.row, index < conversations.length - 1 && styles.divider]}
                onPress={() => router.push({ pathname: "/chat/[id]", params: { id: conv.id } })}
              >
                <View style={styles.avatar}>
                  <Ionicons name="storefront-outline" size={18} color={colors.brandInk} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.name}>{user ? otherName(conv, user.uid) : "Chat"}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {conv.lastPreview || "Encrypted message"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.washStrong} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    marginTop: 36,
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.washStrong,
    paddingVertical: 36,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    color: colors.text,
  },
  emptyCopy: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
  },
  list: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.wash,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  preview: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
