import { colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image as RNImage,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN = Dimensions.get("window");

export function fitImageSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const scale = Math.min(maxWidth / w, maxHeight / h);
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
  };
}

export function FittedImage({
  uri,
  maxWidth = 268,
  maxHeight = 420,
  onPress,
  radius = 14,
}: {
  uri: string;
  maxWidth?: number;
  maxHeight?: number;
  onPress?: () => void;
  radius?: number;
}) {
  const [box, setBox] = useState(() => ({ width: maxWidth, height: Math.round(maxWidth * 0.75) }));

  useEffect(() => {
    let alive = true;
    RNImage.getSize(
      uri,
      (width, height) => {
        if (alive) setBox(fitImageSize(width, height, maxWidth, maxHeight));
      },
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [maxHeight, maxWidth, uri]);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} disabled={!onPress}>
      <RNImage
        source={{ uri }}
        style={[box, { borderRadius: radius, backgroundColor: colors.wash }]}
        resizeMode="contain"
        onLoad={(event) => {
          const src = event.nativeEvent.source;
          if (src?.width && src?.height) {
            setBox(fitImageSize(src.width, src.height, maxWidth, maxHeight));
          }
        }}
      />
    </TouchableOpacity>
  );
}

export function ImageLightbox({
  uris,
  index = 0,
  onClose,
}: {
  uris: string[] | null;
  index?: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const width = SCREEN.width;
  const [page, setPage] = useState(index);

  useEffect(() => {
    setPage(index);
  }, [index, uris]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)));
  }

  return (
    <Modal visible={!!uris?.length} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.screen}>
        <TouchableOpacity
          style={[styles.close, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        {uris?.length ? (
          <ScrollView
            key={`${uris.join("|")}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            contentOffset={{ x: index * width, y: 0 }}
          >
            {uris.map((uri) => (
              <Pressable key={uri} style={{ width, height: SCREEN.height }} onPress={onClose}>
                <Image source={{ uri }} style={styles.full} contentFit="contain" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {uris && uris.length > 1 ? (
          <View style={[styles.dots, { bottom: insets.bottom + 16 }]}>
            {uris.map((uri, i) => (
              <View key={uri} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "rgba(6,16,42,0.96)",
  },
  close: {
    position: "absolute",
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  full: {
    width: "100%",
    height: "100%",
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  dotOn: {
    backgroundColor: "#fff",
  },
});
