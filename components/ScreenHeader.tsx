import { colors, fonts } from "@/constants/theme";
import { Image } from "expo-image";
import { type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOGO = require("@/assets/icons/company/carloop.png");
const LOGO_RATIO = 1024 / 250;

export const TAB_HEADER_PAD_TOP = 12;
export const TAB_HEADER_PAD_X = 20;
export const BRAND_LOGO_HEIGHT = 22;

export function BrandLogo({ height = BRAND_LOGO_HEIGHT }: { height?: number }) {
  return (
    <Image source={LOGO} style={{ height, width: height * LOGO_RATIO }} contentFit="contain" />
  );
}

export function BrandMark() {
  return (
    <View style={styles.mark}>
      <BrandLogo height={BRAND_LOGO_HEIGHT} />
    </View>
  );
}

export function TabHeaderFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + TAB_HEADER_PAD_TOP, paddingHorizontal: TAB_HEADER_PAD_X }}>
      {children}
    </View>
  );
}

type ScreenHeaderProps = {
  title: string;
  lede?: string;
  right?: ReactNode;
};

export function ScreenHeader({ title, lede, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <BrandMark />
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {right ?? <View style={styles.rightSlot} />}
      </View>
      {lede ? <Text style={styles.lede}>{lede}</Text> : null}
    </View>
  );
}

export function IconButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress} activeOpacity={0.8}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mark: {
    height: BRAND_LOGO_HEIGHT,
    justifyContent: "center",
    marginBottom: 14,
  },
  header: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: colors.text,
  },
  rightSlot: {
    width: 44,
    height: 44,
  },
  lede: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
  },
});
