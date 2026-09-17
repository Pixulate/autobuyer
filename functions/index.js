const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const apn = require("apn");

initializeApp();

const BUNDLE_ID = "com.autoquest.autobuyer";

function apnAuth() {
  const key = process.env.APNS_KEY;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!key || !keyId || !teamId) return null;
  return {
    key: key.replace(/\\n/g, "\n"),
    keyId,
    teamId,
  };
}

function normalizeToken(token) {
  return String(token || "")
    .replace(/[<>\s]/g, "")
    .toLowerCase();
}

function makeVoipNote(payload) {
  const note = new apn.Notification();
  note.topic = `${BUNDLE_ID}.voip`;
  note.pushType = "voip";
  note.priority = 10;
  note.expiry = 0;
  note.payload = payload;
  return note;
}

async function sendVoipOnce(token, payload, production) {
  const auth = apnAuth();
  if (!auth) return { sent: false, reason: "missing-apns" };
  const provider = new apn.Provider({ token: auth, production });
  try {
    const result = await provider.send(makeVoipNote(payload), token);
    const failed = result.failed || [];
    return {
      sent: result.sent?.length > 0,
      env: production ? "production" : "sandbox",
      failed,
      reason: failed[0]?.response?.reason,
    };
  } finally {
    provider.shutdown();
  }
}

async function sendVoip(token, payload, preferredSandbox) {
  const auth = apnAuth();
  if (!auth) {
    console.warn("APNs VoIP not configured (APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID)");
    return { sent: false, reason: "missing-apns" };
  }
  const device = normalizeToken(token);
  if (!device || device.length < 32) {
    return { sent: false, reason: "bad-token-format" };
  }

  const order =
    preferredSandbox === false ? [true, false] : preferredSandbox === true ? [false, true] : [false, true];

  let last = null;
  for (const production of order) {
    last = await sendVoipOnce(device, payload, production);
    if (last.sent) {
      console.log("VoIP sent", { env: last.env });
      return last;
    }
    if (last.reason && last.reason !== "BadDeviceToken" && last.reason !== "DeviceTokenNotForTopic") {
      console.error("VoIP send failed", last.failed);
      return last;
    }
  }
  console.error("VoIP send failed", last?.failed);
  return last || { sent: false, reason: "unknown" };
}

async function sendAndroidData(token, payload) {
  await getMessaging().send({
    token,
    data: {
      type: "incoming-call",
      callId: String(payload.callId || ""),
      callerName: String(payload.callerName || ""),
      uuid: String(payload.uuid || ""),
      nativeUuid: String(payload.uuid || ""),
      handle: "Carloop",
      name: String(payload.callerName || "Dealer"),
      callUUID: String(payload.uuid || ""),
    },
    android: {
      priority: "high",
      ttl: 0,
    },
  });
  return { sent: true };
}

async function sendExpoPush(token, payload) {
  if (!token) return { sent: false, reason: "no-token" };
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      title: payload.callerName,
      body: "Incoming call",
      sound: "default",
      priority: "high",
      channelId: "incoming-calls",
      interruptionLevel: "time-sensitive",
      data: payload,
    }),
  });
  const body = await res.text();
  return { sent: res.ok, status: res.status, body };
}

async function ringCallee(callId, data) {
  const calleeId = data.calleeId;
  if (!calleeId) return { ok: false };
  const user = (await getFirestore().collection("users").doc(calleeId).get()).data() || {};
  const payload = {
    uuid: data.nativeUuid || callId,
    nativeUuid: data.nativeUuid || callId,
    callId,
    callerName: data.callerName || "Buyer",
    handle: "Carloop",
    type: "incoming-call",
  };
  const results = {};
  if (user.voipPushToken) {
    results.voip = await sendVoip(user.voipPushToken, payload, user.voipApnsSandbox);
  }
  if (user.devicePushToken && user.pushPlatform === "android") {
    try {
      results.fcm = await sendAndroidData(user.devicePushToken, payload);
    } catch (error) {
      console.error("Android data push failed", error);
      results.fcm = { sent: false, error: String(error) };
    }
  }
  if (user.expoPushToken && results.voip?.sent !== true) {
    try {
      results.expo = await sendExpoPush(user.expoPushToken, payload);
    } catch (error) {
      results.expo = { sent: false, error: String(error) };
    }
  }
  return results;
}

exports.onCallCreated = onDocumentCreated("calls/{callId}", async (event) => {
  const data = event.data?.data();
  if (!data || data.status !== "ringing") return;
  const results = await ringCallee(event.params.callId, data);
  console.log("Incoming call wake", event.params.callId, results);
});

exports.sendVoipCall = onCall({ cors: true, invoker: "public" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required");
  }
  const { callId, calleeId, callerName, nativeUuid } = request.data || {};
  if (!callId || !calleeId) {
    throw new HttpsError("invalid-argument", "callId and calleeId required");
  }
  return ringCallee(callId, { calleeId, callerName, nativeUuid, status: "ringing" });
});
