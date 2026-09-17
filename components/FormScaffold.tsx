import { colors, fonts } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FormScaffoldProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function FormScaffold({ title, onClose, children, footer }: FormScaffoldProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === "ios" ? 18 : insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.iconBtn} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: (footer ? 16 : 28) + insets.bottom }]}
        >
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export const formStyles = StyleSheet.create({
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  hint: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: colors.wash,
    borderColor: colors.brandDark,
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  chipTextOn: {
    color: colors.brandInk,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.onBrand,
  },
  dangerBtn: {
    marginTop: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.red,
  },
  error: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.red,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
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
  body: {
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
