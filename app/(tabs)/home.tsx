import { TAB_BAR_HEIGHT } from "@/components/AppTabBar";
import { HomeBanner } from "@/components/HomeBanner";
import { VehicleAdModal, vehicleToAd, type VehicleAd } from "@/components/VehicleAdModal";
import { colors, fonts } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { missingToBeFound } from "@/lib/buyer";
import { useBuyer } from "@/lib/buyerProfile";
import { useChat } from "@/lib/chat";
import { listenRecentVehicles, type OfferedVehicle } from "@/lib/vehicles";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
};

function timeAgo(ms: number) {
  if (!ms) return "Just now";
  const mins = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile } = useBuyer();
  const { conversations, otherName } = useChat();
  const [vehicles, setVehicles] = useState<OfferedVehicle[]>([]);
  const [ad, setAd] = useState<VehicleAd | null>(null);

  useEffect(
    () =>
      listenRecentVehicles(
        profile.lat != null && profile.lng != null ? { lat: profile.lat, lng: profile.lng } : null,
        setVehicles
      ),
    [profile.lat, profile.lng]
  );

  const toBeFound = useMemo(() => missingToBeFound(profile), [profile]);

  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];
    if (user) {
      conversations.slice(0, 4).forEach((conv) => {
        items.push({
          id: conv.id,
          title: `Dealership reply · ${otherName(conv, user.uid)}`,
          subtitle: conv.lastPreview || timeAgo(conv.lastMessageAt?.toMillis?.() ?? 0),
          onPress: () => router.push({ pathname: "/chat/[id]", params: { id: conv.id } }),
        });
      });
    }
    if (!profile.interests.length) {
      items.push({
        id: "add-interest",
        title: "Add a vehicle you want",
        subtitle: "Dealerships browse buyer profiles — interests help you get found.",
        onPress: () => router.push("/interest-edit"),
      });
    }
    if (toBeFound.length && (!profile.bio.trim() || !profile.timeline)) {
      items.push({
        id: "finish-profile",
        title: "Finish your buyer profile",
        subtitle: "Sellers look through a catalog of buyers. A complete profile gets noticed.",
        onPress: () => router.push("/profile-edit"),
      });
    }
    if (!items.length) {
      items.push({
        id: "live",
        title: toBeFound.length ? "Waiting on a few details" : "Your profile is live",
        subtitle: toBeFound.length
          ? "Dealerships will see you once the items above are done."
          : "Dealerships will message you here when they have a fit.",
      });
    }
    return items.slice(0, 4);
  }, [conversations, otherName, profile.bio, profile.interests.length, profile.timeline, toBeFound.length, user]);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}
      >
        <View style={styles.bannerBleed} />
        <HomeBanner />

        <View style={styles.body}>
          {toBeFound.length ? (
            <View style={styles.setupCard}>
              <Text style={styles.setupTitle}>Finish these so you can be found</Text>
              {toBeFound.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.setupRow, index < toBeFound.length - 1 && styles.setupDivider]}
                  onPress={() => router.push(item.href)}
                  activeOpacity={0.75}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowDetail}>{item.hint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, toBeFound.length ? { marginTop: 28 } : null]}>Activity</Text>
          <View style={styles.cardList}>
            {activity.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, index < activity.length - 1 && styles.rowDivider]}
                onPress={item.onPress}
                disabled={!item.onPress}
                activeOpacity={item.onPress ? 0.7 : 1}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowDetail} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Recently offered</Text>
          <Text style={styles.sectionHint}>Offered in chat to buyers near you — not a public marketplace.</Text>
          {vehicles.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offerRow}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={styles.offerCard}
                  onPress={() => setAd(vehicleToAd(vehicle))}
                  activeOpacity={0.85}
                >
                  {vehicle.photo ? (
                    <Image source={{ uri: vehicle.photo }} style={styles.offerPhoto} contentFit="cover" />
                  ) : (
                    <View style={styles.offerPhoto} />
                  )}
                  <Text style={styles.offerTitle} numberOfLines={2}>
                    {vehicle.title}
                  </Text>
                  <Text style={styles.offerMeta} numberOfLines={1}>
                    {[vehicle.priceLabel, vehicle.detail].filter(Boolean).join(" • ")}
                  </Text>
                  <Text style={styles.offerDealer} numberOfLines={1}>
                    {vehicle.dealer}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.rowTitle}>No offers yet</Text>
              <Text style={styles.emptyCopy}>
                When a dealership offers a vehicle to someone near you, it will land here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      <VehicleAdModal ad={ad} onClose={() => setAd(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bannerBleed: {
    height: 420,
    marginTop: -420,
    backgroundColor: "#06102A",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  setupCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  setupTitle: {
    marginBottom: 8,
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
  },
  setupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  setupDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.wash,
  },
  sectionTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 20,
    color: colors.text,
    marginBottom: 12,
  },
  sectionHint: {
    marginTop: -6,
    marginBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  cardList: {
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
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.wash,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  rowDetail: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  offerRow: {
    gap: 12,
    paddingRight: 8,
  },
  offerCard: {
    width: 196,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.washStrong,
    padding: 10,
  },
  offerPhoto: {
    width: "100%",
    height: 110,
    borderRadius: 14,
    backgroundColor: colors.wash,
  },
  offerTitle: {
    marginTop: 10,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  offerMeta: {
    marginTop: 3,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  offerDealer: {
    marginTop: 6,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.brandDark,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.washStrong,
    backgroundColor: colors.surface,
    padding: 18,
  },
  emptyCopy: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
});
