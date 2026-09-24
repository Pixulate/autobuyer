import { FittedImage, ImageLightbox } from "@/components/ImageLightbox";
import { VehicleAdModal, type VehicleAd } from "@/components/VehicleAdModal";
import { colors, fonts } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useCall } from "@/lib/calling";
import { listenMessages, sendChatImage, sendEncryptedMessage, useChat, type ChatMessage } from "@/lib/chat";
import { decryptText } from "@/lib/crypto";
import { db } from "@/lib/firebase";
import { pickImage, uploadChatImage } from "@/lib/media";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, convKeyFor, otherName } = useChat();
  const { startCall } = useCall();
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [peerToken, setPeerToken] = useState<string | undefined>();
  const [attachOpen, setAttachOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ad, setAd] = useState<VehicleAd | null>(null);
  const [lightbox, setLightbox] = useState<{ uris: string[]; index: number } | null>(null);

  const conv = conversations.find((item) => item.id === id);
  const convKey = conv ? convKeyFor(conv) : null;
  const title = user && conv ? otherName(conv, user.uid) : "Dealership";
  const peerId = conv?.users.find((uid) => uid !== user?.uid);

  useEffect(() => {
    if (!id || !user) return;
    return listenMessages(id, user.uid, setRows);
  }, [id, user]);

  useEffect(() => {
    if (!peerId) return;
    getDoc(doc(db, "users", peerId)).then((snap) => {
      setPeerToken(snap.data()?.expoPushToken);
    });
  }, [peerId]);

  const decrypted = useMemo(() => {
    return rows.map((row) => {
      if (row.type === "image" || row.type === "vehicle") {
        return { ...row, body: row.text || "" };
      }
      if (row.ciphertext && row.nonce && convKey) {
        try {
          return { ...row, body: decryptText(row.nonce, row.ciphertext, convKey) };
        } catch {
          return { ...row, body: "Unable to decrypt" };
        }
      }
      return { ...row, body: row.text || "" };
    });
  }, [convKey, rows]);

  const listing = decrypted.reduce<ChatMessage | null>((latest, row) => {
    if (!row.vehicle) return latest;
    if (!latest) return row;
    return (row.createdAt?.toMillis?.() ?? 0) >= (latest.createdAt?.toMillis?.() ?? 0) ? row : latest;
  }, null)?.vehicle;

  const onSend = async () => {
    const text = draft.trim();
    if (!text || !user || !id || !convKey) return;
    setDraft("");
    await sendEncryptedMessage({
      conversationId: id,
      senderId: user.uid,
      users: conv?.users ?? [user.uid],
      convKey,
      text,
    });
  };

  async function onAttachPhoto() {
    if (!user || !id) return;
    const uri = await pickImage({ square: false });
    if (!uri) return;
    setBusy(true);
    try {
      const imageUrl = await uploadChatImage(id, uri);
      await sendChatImage({
        conversationId: id,
        senderId: user.uid,
        users: conv?.users ?? [user.uid],
        imageUrl,
      });
    } catch {
      Alert.alert("Photo", "Could not send that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => {
            if (!peerId || !id) return;
            startCall({
              calleeId: peerId,
              calleeName: title,
              conversationId: id,
              calleePushToken: peerToken,
            });
          }}
        >
          <Ionicons name="call-outline" size={20} color={colors.brandInk} />
        </TouchableOpacity>
      </View>
      {listing ? (
        <TouchableOpacity style={styles.listingBar} onPress={() => setAd(listing)} activeOpacity={0.88}>
          {listing.photos?.[0] || listing.photo ? (
            <Image
              source={{ uri: listing.photos?.[0] || listing.photo }}
              style={styles.listingThumb}
              contentFit="cover"
            />
          ) : (
            <View style={styles.listingThumb}>
              <Ionicons name="car-sport-outline" size={18} color={colors.onBrand} />
            </View>
          )}
          <View style={styles.listingCopy}>
            <Text style={styles.listingKicker}>Latest offer</Text>
            {listing.priceLabel ? (
              <Text style={styles.listingPrice} numberOfLines={1}>
                {listing.priceLabel}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled">
          {decrypted.map((row) => {
            const mine = row.senderId === user?.uid;
            if (row.type === "vehicle" && row.vehicle) {
              const cover = row.vehicle.photos?.[0] || row.vehicle.photo;
              return (
                <TouchableOpacity
                  key={row.id}
                  style={[styles.offerCard, mine ? styles.offerMine : styles.offerTheirs]}
                  onPress={() => setAd(row.vehicle ?? null)}
                  activeOpacity={0.88}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} style={styles.offerPhoto} contentFit="cover" />
                  ) : (
                    <View style={styles.offerPhoto} />
                  )}
                  <View style={styles.offerPricePill}>
                    <Text style={styles.offerPrice}>{row.vehicle.priceLabel}</Text>
                  </View>
                  <Text style={styles.offerTitle}>{row.vehicle.title}</Text>
                  <Text style={styles.offerMeta}>
                    {[row.vehicle.detail, row.vehicle.photos?.length ? `${row.vehicle.photos.length} photos` : ""]
                      .filter(Boolean)
                      .join(" • ")}
                  </Text>
                  <Text style={styles.offerDealer}>{row.vehicle.dealer}</Text>
                  <Text style={styles.offerTap}>Tap to view listing</Text>
                </TouchableOpacity>
              );
            }
            if (row.type === "image" && row.imageUrl) {
              return (
                <View key={row.id} style={[styles.imageBubble, mine ? styles.imageMine : styles.imageTheirs]}>
                  <FittedImage
                    uri={row.imageUrl}
                    maxWidth={268}
                    maxHeight={360}
                    onPress={() => setLightbox({ uris: [row.imageUrl!], index: 0 })}
                  />
                </View>
              );
            }
            return (
              <View key={row.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.body, mine && { color: colors.onBrand }]}>{row.body}</Text>
              </View>
            );
          })}
        </ScrollView>

        {attachOpen ? (
          <Pressable style={styles.attachScrim} onPress={() => setAttachOpen(false)}>
            <View style={[styles.attachMenu, { bottom: 58 + Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                style={styles.attachItem}
                disabled={busy}
                onPress={() => {
                  setAttachOpen(false);
                  void onAttachPhoto();
                }}
              >
                <Ionicons name="image-outline" size={18} color={colors.text} />
                <Text style={styles.attachLabel}>Photo</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ) : null}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={styles.plus} disabled={busy} onPress={() => setAttachOpen((open) => !open)}>
            <Ionicons name={attachOpen ? "close" : "add"} size={22} color={colors.brandInk} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={convKey ? "Message" : "Waiting for encryption keys…"}
            editable={!!convKey}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.send} onPress={onSend} disabled={!convKey}>
            <Ionicons name="send" size={18} color={colors.onBrand} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <VehicleAdModal ad={ad} onClose={() => setAd(null)} />
      <ImageLightbox
        uris={lightbox?.uris ?? null}
        index={lightbox?.index}
        onClose={() => setLightbox(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
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
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
  },
  listingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.brandInk,
  },
  listingThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  listingCopy: {
    flex: 1,
    minWidth: 0,
  },
  listingKicker: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  listingPrice: {
    marginTop: 2,
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.onBrand,
  },
  thread: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  imageBubble: {
    maxWidth: "100%",
    padding: 4,
    borderRadius: 18,
    overflow: "visible",
  },
  imageMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand,
  },
  imageTheirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  offerCard: {
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.washStrong,
    overflow: "hidden",
  },
  offerMine: {
    alignSelf: "flex-end",
  },
  offerTheirs: {
    alignSelf: "flex-start",
  },
  offerPhoto: {
    width: "100%",
    height: 132,
    borderRadius: 12,
    backgroundColor: colors.wash,
  },
  offerPricePill: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(6,16,42,0.78)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offerPrice: {
    color: colors.onBrand,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
  },
  offerTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
    marginTop: 8,
  },
  offerMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  offerDealer: {
    color: colors.brandDark,
    fontSize: 11,
    marginTop: 6,
    fontFamily: fonts.semibold,
  },
  offerTap: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  attachScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  attachMenu: {
    position: "absolute",
    left: 12,
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.washStrong,
  },
  attachItem: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attachLabel: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  composer: {
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  plus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.wash,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
