import { useAuth } from "@/lib/auth";
import { conversationIdFor, encryptText, loadOrCreateKeys, randomConvKey, unwrapKey, wrapKeyFor, type KeyPair, type WrappedKey } from "@/lib/crypto";
import { reportError } from "@/lib/errors";
import { db } from "@/lib/firebase";
import { registerPushToken } from "@/lib/push";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PublicUser = {
  uid: string;
  email: string;
  displayName: string;
  publicKey: string;
  expoPushToken?: string;
  voipPushToken?: string;
  role?: string;
};

export type Conversation = {
  id: string;
  users: string[];
  names: Record<string, string>;
  wrappedKeys?: Record<string, WrappedKey>;
  lastMessageAt?: { toMillis?: () => number } | null;
  lastPreview?: string;
};

export type VehicleOfferPayload = {
  vehicleId: string;
  title: string;
  priceLabel: string;
  detail: string;
  photo?: string;
  photos?: string[];
  make?: string;
  model?: string;
  year?: string;
  km?: number | null;
  bodyStyle?: string;
  dealer: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  createdAt?: { toMillis?: () => number } | null;
  nonce?: string;
  ciphertext?: string;
  text?: string;
  type?: string;
  imageUrl?: string;
  vehicle?: VehicleOfferPayload;
};

type ChatContextValue = {
  keys: KeyPair | null;
  conversations: Conversation[];
  loading: boolean;
  otherName: (conv: Conversation, myUid: string) => string;
  openConversation: (other: PublicUser) => Promise<string>;
  findUserByEmail: (email: string) => Promise<PublicUser | null>;
  convKeyFor: (conv: Conversation) => string | null;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [keys, setKeys] = useState<KeyPair | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [peerKeys, setPeerKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      setKeys(null);
      setConversations([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const pair = await loadOrCreateKeys(user.uid);
        if (cancelled) return;
        setKeys(pair);
        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            email: (user.email ?? "").toLowerCase(),
            displayName: user.displayName ?? "",
            publicKey: pair.publicKey,
            role: "buyer",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await registerPushToken(user.uid);
      } catch (error) {
        reportError("Publishing encryption keys", error);
      }
    })();

    const q = query(collection(db, "conversations"), where("users", "array-contains", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            users: (data.users as string[]) ?? [],
            names: (data.names as Record<string, string>) ?? {},
            wrappedKeys: data.wrappedKeys as Record<string, WrappedKey> | undefined,
            lastMessageAt: data.lastMessageAt,
            lastPreview: data.lastPreview as string | undefined,
          } satisfies Conversation;
        });
        rows.sort((a, b) => (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0));
        setConversations(rows);
        setLoading(false);
      },
      (error) => {
        reportError("Loading conversations", error);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  const loadPeerKey = useCallback(async (uid: string) => {
    if (peerKeys[uid]) return peerKeys[uid];
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const publicKey = snap.data()?.publicKey as string | undefined;
      if (publicKey) {
        setPeerKeys((prev) => ({ ...prev, [uid]: publicKey }));
        return publicKey;
      }
    } catch (error) {
      reportError("Loading user public key", error);
    }
    return null;
  }, [peerKeys]);

  const convKeyFor = useCallback(
    (conv: Conversation) => {
      if (!user || !keys) return null;
      const wrapped = conv.wrappedKeys?.[user.uid];
      if (!wrapped) return null;
      try {
        const senderPub = wrapped.from === user.uid ? keys.publicKey : peerKeys[wrapped.from];
        if (!senderPub && wrapped.from !== user.uid) {
          loadPeerKey(wrapped.from);
          return null;
        }
        return unwrapKey(wrapped, senderPub ?? keys.publicKey, keys.secretKey);
      } catch (error) {
        reportError("Decrypting conversation key", error, { alert: false });
        return null;
      }
    },
    [keys, loadPeerKey, peerKeys, user]
  );

  const openConversation = useCallback(
    async (other: PublicUser) => {
      if (!user || !keys) {
        throw new Error("Not ready to chat");
      }
      if (!other.publicKey) {
        throw new Error("That account has not set up encrypted chat yet.");
      }
      const id = conversationIdFor(user.uid, other.uid);
      const ref = doc(db, "conversations", id);
      const alreadyOpen = conversations.some((item) => item.id === id);
      if (alreadyOpen) {
        return id;
      }

      const convKey = randomConvKey();
      const wrappedKeys = {
        [user.uid]: wrapKeyFor(convKey, keys.publicKey, keys.secretKey, user.uid),
        [other.uid]: wrapKeyFor(convKey, other.publicKey, keys.secretKey, user.uid),
      };

      await setDoc(ref, {
        users: [user.uid, other.uid],
        names: {
          [user.uid]: user.displayName || user.email || "Buyer",
          [other.uid]: other.displayName || other.email || "Seller",
        },
        wrappedKeys,
        lastPreview: "Encrypted chat started",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        e2e: true,
      });
      return id;
    },
    [conversations, keys, user]
  );

  const findUserByEmail = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    try {
      const snap = await getDocs(query(collection(db, "users"), where("email", "==", normalized), limit(1)));
      const row = snap.docs[0];
      if (!row) return null;
      const data = row.data();
      return {
        uid: row.id,
        email: data.email ?? normalized,
        displayName: data.displayName ?? "",
        publicKey: data.publicKey ?? "",
        expoPushToken: data.expoPushToken,
        voipPushToken: data.voipPushToken,
        role: data.role,
      } satisfies PublicUser;
    } catch (error) {
      reportError("Looking up user", error);
      throw error;
    }
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      keys,
      conversations,
      loading,
      otherName: (conv, myUid) => {
        const other = conv.users.find((id) => id !== myUid);
        return (other && conv.names?.[other]) || "Seller";
      },
      openConversation,
      findUserByEmail,
      convKeyFor,
    }),
    [conversations, convKeyFor, findUserByEmail, keys, loading, openConversation]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used inside ChatProvider");
  }
  return ctx;
}

export async function sendChatImage(opts: {
  conversationId: string;
  senderId: string;
  users: string[];
  imageUrl: string;
}) {
  try {
    await addDoc(collection(db, "conversations", opts.conversationId, "messages"), {
      senderId: opts.senderId,
      users: opts.users,
      type: "image",
      imageUrl: opts.imageUrl,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "conversations", opts.conversationId), {
      lastMessageAt: serverTimestamp(),
      lastPreview: "Photo",
    });
  } catch (error) {
    reportError("Sending photo", error);
    throw error;
  }
}

export async function sendEncryptedMessage(opts: {
  conversationId: string;
  senderId: string;
  users: string[];
  convKey: string;
  text: string;
}) {
  const payload = encryptText(opts.text, opts.convKey);
  try {
    await addDoc(collection(db, "conversations", opts.conversationId, "messages"), {
      senderId: opts.senderId,
      users: opts.users,
      type: "text",
      nonce: payload.nonce,
      ciphertext: payload.ciphertext,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "conversations", opts.conversationId), {
      lastMessageAt: serverTimestamp(),
      lastPreview: "Encrypted message",
    });
  } catch (error) {
    reportError("Sending message", error);
    throw error;
  }
}

export function listenMessages(conversationId: string, uid: string, onRows: (rows: ChatMessage[]) => void) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    where("users", "array-contains", uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          senderId: data.senderId,
          createdAt: data.createdAt,
          nonce: data.nonce,
          ciphertext: data.ciphertext,
          text: data.text,
          type: data.type,
          imageUrl: data.imageUrl,
          vehicle: data.vehicle as VehicleOfferPayload | undefined,
        } satisfies ChatMessage;
      });
      rows.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
      onRows(rows);
    },
    (error) => reportError("Loading messages", error)
  );
}
