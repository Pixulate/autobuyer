import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants/theme";

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }> = {
  home: { active: "home", idle: "home-outline" },
  messages: { active: "chatbubble", idle: "chatbubble-outline" },
  profile: { active: "person", idle: "person-outline" },
};

const LABELS: Record<string, string> = {
  home: "Home",
  messages: "Messages",
  profile: "Profile",
};

export const TAB_BAR_HEIGHT = 110;

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icons = ICONS[route.name] ?? ICONS.home;
          const color = focused ? colors.onBrand : colors.tabInactive;

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, focused && styles.tabActive]}
              activeOpacity={0.85}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync();
                  navigation.navigate(route.name);
                }
              }}
            >
              <Ionicons name={focused ? icons.active : icons.idle} size={22} color={color} />
              <Text style={[styles.label, { color, fontFamily: focused ? fonts.semibold : fonts.regular }]}>
                {LABELS[route.name] ?? route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.washStrong,
    shadowColor: colors.brandInk,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: colors.brand,
  },
  label: {
    fontSize: 11,
  },
});
