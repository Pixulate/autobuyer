import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { NativeModules, Platform } from "react-native";
import { reportError } from "@/lib/errors";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isCall = notification.request.content.data?.type === "incoming-call";
    return {
      shouldShowBanner: !isCall,
      shouldShowList: !isCall,
      shouldPlaySound: !isCall,
      shouldSetBadge: true,
    };
  },
});

async function registerVoipToken(uid: string) {
  if (Platform.OS !== "ios" || !NativeModules.RNVoipPushNotificationManager) {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const VoipPushNotification = require("react-native-voip-push-notification").default;
    VoipPushNotification.addEventListener("register", async (token: string) => {
      await setDoc(
        doc(db, "users", uid),
        {
          voipPushToken: String(token).replace(/[<>\s]/g, "").toLowerCase(),
          voipApnsSandbox: typeof __DEV__ !== "undefined" ? __DEV__ : true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
    VoipPushNotification.addEventListener("notification", (notification: { uuid?: string; data?: { uuid?: string } }) => {
      const uuid = notification?.uuid || notification?.data?.uuid;
      if (uuid) {
        VoipPushNotification.onVoipNotificationCompleted(uuid);
      }
    });
    VoipPushNotification.registerVoipToken();
  } catch (error) {
    reportError("Registering VoIP token", error, { alert: false });
  }
}

export async function registerPushToken(uid: string) {
  if (Platform.OS === "web") {
    return null;
  }
  try {
    if (!Device.isDevice) {
      console.warn("[Carloop] Push tokens need a physical device for native calling.");
      return null;
    }
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") {
      console.warn("[Carloop] Notification permission not granted — incoming calls won't wake the device.");
      return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("incoming-calls", {
        name: "Incoming calls",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        sound: "default",
        enableVibrate: true,
      });
    }

    const projectId =
      Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    let devicePushToken: string | undefined;
    try {
      devicePushToken = (await Notifications.getDevicePushTokenAsync()).data as string;
    } catch {
      devicePushToken = undefined;
    }
    await setDoc(
      doc(db, "users", uid),
      {
        expoPushToken: token,
        devicePushToken: devicePushToken ?? null,
        pushPlatform: Platform.OS,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await registerVoipToken(uid);
    return token;
  } catch (error) {
    reportError("Registering push token", error, { alert: false });
    return null;
  }
}

async function sendExpoCallPush(opts: {
  token: string;
  callerName: string;
  callId: string;
  nativeUuid?: string;
  visible: boolean;
}) {
  const payload: Record<string, unknown> = {
    to: opts.token,
    sound: opts.visible ? "default" : null,
    channelId: "incoming-calls",
    priority: "high",
    interruptionLevel: "time-sensitive",
    _contentAvailable: true,
    data: {
      type: "incoming-call",
      callId: opts.callId,
      callerName: opts.callerName,
      nativeUuid: opts.nativeUuid ?? "",
      uuid: opts.nativeUuid ?? "",
    },
  };
  if (opts.visible) {
    payload.title = opts.callerName;
    payload.body = "Incoming call";
    payload.categoryId = "incoming-call";
  }
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[Carloop] Expo push failed", res.status, body);
  }
}

export async function sendIncomingCallPush(opts: {
  token?: string;
  voipToken?: string;
  devicePushToken?: string;
  pushPlatform?: string;
  calleeId?: string;
  callerName: string;
  callId: string;
  nativeUuid?: string;
}) {
  if (!opts.token && !opts.voipToken && !opts.devicePushToken && !opts.calleeId) {
    console.warn("[Carloop] Callee has no push token; call will only ring if their app is open.");
    return;
  }
  try {
    if (opts.token) {
      await sendExpoCallPush({
        token: opts.token,
        callerName: opts.callerName,
        callId: opts.callId,
        nativeUuid: opts.nativeUuid,
        visible: true,
      });
    }
  } catch (error) {
    reportError("Sending call push", error, { alert: false });
  }
}
