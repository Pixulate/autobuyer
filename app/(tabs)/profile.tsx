import { TAB_BAR_HEIGHT } from "@/components/AppTabBar";
import { BrandLogo, BRAND_LOGO_HEIGHT, TAB_HEADER_PAD_TOP, TAB_HEADER_PAD_X } from "@/components/ScreenHeader";
import { colors, fonts } from "@/constants/theme";
import {
  formatPreference,
  interestMeta,
  interestTitle,
} from "@/lib/buyer";
import { promptProfilePhoto } from "@/lib/avatar";
import { useAuth } from "@/lib/auth";
import { useBuyer } from "@/lib/buyerProfile";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "B";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { profile, loading, error, setPhoto, removePhoto } = useBuyer();
  const [photoBusy, setPhotoBusy] = useState(false);

  const details = [
    profile.timeline ? { label: "Timeline", value: profile.timeline } : null,
    profile.condition ? { label: "Condition", value: profile.condition } : null,
    profile.payment ? { label: "Payment", value: profile.payment } : null,
    profile.preapproved ? { label: "Financing", value: profile.preapproved } : null,
    profile.currentVehicle ? { label: "Trade-in", value: profile.currentVehicle } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom }}
      >
        <View style={styles.bannerBleed} />
        <View style={[styles.cover, { height: 132 + insets.top }]}>
          <View style={[styles.coverBar, { paddingTop: insets.top + TAB_HEADER_PAD_TOP }]}>
            <BrandLogo height={BRAND_LOGO_HEIGHT} />
          </View>
        </View>

        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.avatarBtn}
            activeOpacity={0.85}
            onPress={() =>
              promptProfilePhoto({
                hasPhoto: !!profile.photoUrl,
                onPicked: async (uri) => {
                  setPhotoBusy(true);
                  try {
                    await setPhoto(uri);
                  } finally {
                    setPhotoBusy(false);
                  }
                },
                onRemoved: () => removePhoto(),
              })
            }
          >
            <View style={styles.avatar}>
              {profile.photoUrl ? (
                <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{initials(profile.name)}</Text>
              )}
              {photoBusy ? (
                <View style={styles.avatarBusy}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color={colors.onBrand} />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{profile.name || "Your profile"}</Text>
          {profile.status || profile.location ? (
            <Text style={styles.headline}>
              {[profile.status, profile.location].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={() => router.push("/profile-edit")}>
            <Text style={styles.editLabel}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>About</Text>
          <Text style={styles.about}>
            {profile.bio.trim() ||
              "Add a short intro so salespeople know who you are — commute, family, and what a good deal looks like. They never see your phone or email here."}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Buying details</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/profile-edit")}>
              <Ionicons name="pencil" size={14} color={colors.onBrand} />
            </TouchableOpacity>
          </View>
          {details.length ? (
            <TouchableOpacity onPress={() => router.push("/profile-edit")} activeOpacity={0.75}>
              {details.map((row) => (
                <DetailRow key={row.label} {...row} />
              ))}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.push("/profile-edit")}>
              <Text style={styles.emptyCopy}>
                Timeline, new vs used, payment, and trade-in help a salesperson bring the right offer.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Looking for</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/interest-edit")}>
              <Ionicons name="add" size={18} color={colors.onBrand} />
            </TouchableOpacity>
          </View>
          {profile.interests.length ? (
            profile.interests.map((interest, index) => (
              <TouchableOpacity
                key={interest.id}
                style={[styles.experience, index < profile.interests.length - 1 && styles.experienceDivider]}
                onPress={() => router.push({ pathname: "/interest-edit", params: { id: interest.id } })}
              >
                <View style={styles.expCopy}>
                  <Text style={styles.expTitle}>{interestTitle(interest) || "Vehicle"}</Text>
                  <Text style={styles.expMeta}>{interestMeta(interest) || "Tap to add years and details"}</Text>
                  {interest.tags.length || interest.color ? (
                    <Text style={styles.expTags} numberOfLines={1}>
                      {[interest.color, ...interest.tags].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity onPress={() => router.push("/interest-edit")}>
              <Text style={styles.emptyCopy}>Name the vehicles you want. Dealers unlock an interest to chat.</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Shopping criteria</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/preference-edit")}>
              <Ionicons name="add" size={18} color={colors.onBrand} />
            </TouchableOpacity>
          </View>
          {profile.preferences.length ? (
            <View style={styles.chips}>
              {profile.preferences.map((pref) => (
                  <TouchableOpacity
                    key={pref.id}
                    style={styles.chip}
                    onPress={() => router.push({ pathname: "/preference-edit", params: { id: pref.id } })}
                  >
                    <Text style={styles.chipLabel}>{formatPreference(pref)}</Text>
                  </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.push("/preference-edit")}>
              <Text style={styles.emptyCopy}>Budget, body style, kilometres, and area — the filters salespeople scan first.</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.8} onPress={() => logout()}>
          <Text style={styles.signOutLabel}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  cover: {
    backgroundColor: "#06102A",
  },
  coverBar: {
    paddingHorizontal: TAB_HEADER_PAD_X,
  },
  hero: {
    paddingHorizontal: 20,
    marginTop: -36,
  },
  avatarBtn: {
    alignSelf: "flex-start",
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#0A1B4A",
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,16,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: "#FFFFFF",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    marginTop: 12,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.text,
  },
  headline: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  editBtn: {
    marginTop: 14,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.brand,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.brand,
  },
  error: {
    marginTop: 12,
    paddingHorizontal: 20,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.red,
  },
  card: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
  },
  about: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  detailRow: {
    paddingVertical: 8,
  },
  detailLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  detailValue: {
    marginTop: 2,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  experience: {
    paddingVertical: 10,
  },
  experienceDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  expCopy: {
    flex: 1,
  },
  expTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  expMeta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  expTags: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    backgroundColor: colors.background,
  },
  chipLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  emptyCopy: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutBtn: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textMuted,
  },
});
