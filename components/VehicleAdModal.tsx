import { ImageLightbox } from "@/components/ImageLightbox";
import { colors, fonts } from "@/constants/theme";
import { getOfferedVehicle, priceLabel, type OfferedVehicle } from "@/lib/vehicles";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type VehicleAd = {
  vehicleId?: string;
  title: string;
  priceLabel: string;
  detail?: string;
  photo?: string;
  photos?: string[];
  make?: string;
  model?: string;
  year?: string;
  km?: number | null;
  bodyStyle?: string;
  dealer: string;
};

export function vehicleToAd(vehicle: OfferedVehicle): VehicleAd {
  return {
    vehicleId: vehicle.id,
    title: vehicle.title,
    priceLabel: vehicle.priceLabel,
    detail: vehicle.detail,
    photo: vehicle.photo,
    photos: vehicle.photos,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    km: vehicle.km,
    bodyStyle: vehicle.bodyStyle,
    dealer: vehicle.dealer,
  };
}

function photosFrom(ad: VehicleAd, live?: OfferedVehicle | null) {
  const livePhotos = live?.photos?.length ? live.photos : live?.photo ? [live.photo] : [];
  const payload = ad.photos?.length ? ad.photos : ad.photo ? [ad.photo] : [];
  return livePhotos.length ? livePhotos : payload;
}

const SHEET_TRAVEL = Dimensions.get("window").height;

export function VehicleAdModal({
  ad,
  onClose,
}: {
  ad: VehicleAd | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const [sheetWidth, setSheetWidth] = useState(Dimensions.get("window").width);
  const [page, setPage] = useState(0);
  const [live, setLive] = useState<OfferedVehicle | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    setPage(0);
    setLive(null);
    if (!ad?.vehicleId) return;
    getOfferedVehicle(ad.vehicleId).then(setLive).catch(() => setLive(null));
  }, [ad?.vehicleId]);

  useEffect(() => {
    if (!ad) return;
    closing.current = false;
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [ad, progress]);

  const dismiss = useCallback(() => {
    if (closing.current || !ad) return;
    closing.current = true;
    setLightbox(null);
    Animated.timing(progress, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      closing.current = false;
      if (finished) onClose();
    });
  }, [ad, onClose, progress]);

  const photos = useMemo(() => (ad ? photosFrom(ad, live) : []), [ad, live]);
  const title = live?.title || ad?.title || "Vehicle";
  const price = live ? priceLabel(live.price) : ad?.priceLabel;
  const dealer = live?.dealer || ad?.dealer;
  const year = live?.year || ad?.year;
  const make = live?.make || ad?.make;
  const model = live?.model || ad?.model;
  const km = live?.km ?? ad?.km;
  const body = live?.bodyStyle || ad?.bodyStyle;
  const detail = [km != null ? `${km.toLocaleString()} km` : "", body, year].filter(Boolean).join(" • ") || ad?.detail;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(event.nativeEvent.contentOffset.x / Math.max(sheetWidth, 1)));
  }

  return (
    <Modal visible={!!ad} animationType="none" transparent onRequestClose={dismiss}>
      <View style={styles.wrap} pointerEvents="box-none">
        <Animated.View style={[styles.scrim, { opacity: progress }]} pointerEvents="none" />
        <Pressable style={styles.scrimHit} onPress={dismiss} />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_TRAVEL, 0],
                  }),
                },
              ],
            },
          ]}
          onLayout={(event) => setSheetWidth(event.nativeEvent.layout.width)}
        >
          <View style={styles.head}>
            <Text style={styles.kicker}>Listing</Text>
            <TouchableOpacity style={styles.close} onPress={dismiss}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {photos.length ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onScroll}
                >
                  {photos.map((uri, index) => (
                    <TouchableOpacity
                      key={uri}
                      activeOpacity={0.92}
                      onPress={() => setLightbox(index)}
                    >
                      <Image
                        source={{ uri }}
                        style={[styles.hero, { width: sheetWidth }]}
                        contentFit="contain"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {photos.length > 1 ? (
                  <View style={styles.dots}>
                    {photos.map((uri, index) => (
                      <View key={uri} style={[styles.dot, index === page && styles.dotOn]} />
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.hero, { width: sheetWidth, backgroundColor: colors.wash }]} />
            )}
            <View style={styles.body}>
              {price ? <Text style={styles.price}>{price}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {detail ? <Text style={styles.detail}>{detail}</Text> : null}
              <View style={styles.facts}>
                {make ? (
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>Make</Text>
                    <Text style={styles.factValue}>{make}</Text>
                  </View>
                ) : null}
                {model ? (
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>Model</Text>
                    <Text style={styles.factValue}>{model}</Text>
                  </View>
                ) : null}
                {year ? (
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>Year</Text>
                    <Text style={styles.factValue}>{year}</Text>
                  </View>
                ) : null}
                {body ? (
                  <View style={styles.fact}>
                    <Text style={styles.factLabel}>Body</Text>
                    <Text style={styles.factValue}>{body}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.seller}>
                <Text style={styles.factLabel}>Listed by</Text>
                <Text style={styles.sellerName}>{dealer}</Text>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
      <ImageLightbox
        uris={lightbox == null ? null : photos}
        index={lightbox ?? 0}
        onClose={() => setLightbox(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,16,42,0.55)" },
  scrimHit: { ...StyleSheet.absoluteFillObject },
  sheet: {
    zIndex: 2,
    maxHeight: "92%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { height: 240, backgroundColor: colors.wash },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.washStrong },
  dotOn: { backgroundColor: colors.brand },
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  price: { color: colors.text, fontFamily: fonts.display, fontSize: 28 },
  title: { color: colors.text, fontFamily: fonts.displaySemi, fontSize: 20, marginTop: 4 },
  detail: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, marginTop: 6 },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  fact: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  factLabel: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 11, textTransform: "uppercase" },
  factValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, marginTop: 3 },
  seller: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  sellerName: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 16, marginTop: 4 },
});
