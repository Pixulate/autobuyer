import { BrandLogo, BRAND_LOGO_HEIGHT, TAB_HEADER_PAD_TOP, TAB_HEADER_PAD_X } from "@/components/ScreenHeader";
import { colors, fonts } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SLOGAN = "The safest\nway to buy\na car.";

export function HomeBanner() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { height: 232 + insets.top }]}>
      <LinearGradient
        colors={["#06102A", "#0A1B4A", "#16307A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.overlay, { paddingTop: insets.top + TAB_HEADER_PAD_TOP }]}>
        <BrandLogo height={BRAND_LOGO_HEIGHT} />

        <View style={styles.copy}>
          <View>
            <Text style={[styles.slogan, styles.depthFar]}>{SLOGAN}</Text>
            <Text style={[styles.slogan, styles.depthMid]}>{SLOGAN}</Text>
            <Text style={[styles.slogan, styles.face]}>{SLOGAN}</Text>
          </View>
          <Text style={styles.lede}>Dealerships find you.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    backgroundColor: "#06102A",
  },
  overlay: {
    flex: 1,
    paddingHorizontal: TAB_HEADER_PAD_X,
    paddingBottom: 18,
    justifyContent: "space-between",
  },
  copy: {
    maxWidth: 200,
  },
  slogan: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.1,
  },
  depthFar: {
    position: "absolute",
    top: 6,
    left: 5,
    color: "#04143A",
  },
  depthMid: {
    position: "absolute",
    top: 3,
    left: 2,
    color: colors.accent,
  },
  face: {
    color: "#FFFFFF",
  },
  lede: {
    marginTop: 14,
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
