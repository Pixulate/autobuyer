import { TAB_BAR_HEIGHT } from "@/components/AppTabBar";
import { ScreenHeader, TabHeaderFrame } from "@/components/ScreenHeader";
import { colors, fonts } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useChat, type Conversation } from "@/lib/chat";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "D";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function replyPreview(conv: Conversation) {
  const preview = conv.lastPreview?.trim();
  if (!preview || preview === "Encrypted message" || preview === "Encrypted chat started") {
    return "New reply";
  }
  if (preview === "Photo") return "Sent a photo";
  return preview;
}

function shortTime(ms?: number) {
  if (!ms) return "";
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, loading, otherName } = useChat();

  return (
    <View style={styles.screen}>
      <TabHeaderFrame>
        <ScreenHeader title="Inbox" />
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
              <Ionicons name="storefront-outline" size={28} color={colors.brandInk} />
            </View>
            <Text style={styles.emptyTitle}>{loading ? "Checking for replies…" : "No replies yet"}</Text>
            <Text style={styles.emptyCopy}>Dealership replies land here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {conversations.map((conv, index) => {
              const name = user ? otherName(conv, user.uid) : "Dealership";
              return (
                <TouchableOpacity
                  key={conv.id}
                  style={[styles.row, index < conversations.length - 1 && styles.divider]}
                  onPress={() => router.push({ pathname: "/chat/[id]", params: { id: conv.id } })}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetters}>{initials(name)}</Text>
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.preview} numberOfLines={1}>
                      {replyPreview(conv)}
                    </Text>
                  </View>
                  <Text style={styles.time}>{shortTime(conv.lastMessageAt?.toMillis?.())}</Text>
                </TouchableOpacity>
              );
            })}
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
    paddingHorizontal: 16,
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
    textAlign: "center",
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
  avatarLetters: {
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    color: colors.brandInk,
  },
  copy: {
    flex: 1,
    minWidth: 0,
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
  time: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
