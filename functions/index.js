const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const apn = require("apn");

initializeApp();

const BUNDLES = {
  buyer: "com.autoquest.autobuyer",
  seller: "com.autoquest.autoseller",
};

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

function normalizePushToken(token) {
  return String(token || "")
    .replace(/[<>\s]/g, "")
    .toLowerCase();
}

function voipTopic(user) {
  if (user?.voipBundleId) return `${user.voipBundleId}.voip`;
  if (user?.voipTopic) return user.voipTopic;
  if (user?.role === "seller" || user?.accountType === "seller") {
    return `${BUNDLES.seller}.voip`;
  }
  return `${BUNDLES.buyer}.voip`;
}

function topicFallbacks(user) {
  const primary = voipTopic(user);
  const extras = [`${BUNDLES.buyer}.voip`, `${BUNDLES.seller}.voip`].filter((topic) => topic !== primary);
  return [primary, ...extras];
}

function makeVoipNote(payload, topic) {
  const note = new apn.Notification();
  note.topic = topic;
  note.pushType = "voip";
  note.priority = 10;
  note.expiry = 0;
  note.payload = payload;
  return note;
}

async function sendVoipOnce(token, payload, production, topic) {
  const auth = apnAuth();
  if (!auth) return { sent: false, reason: "missing-apns" };
  const provider = new apn.Provider({ token: auth, production });
  try {
    const result = await provider.send(makeVoipNote(payload, topic), token);
    const failed = result.failed || [];
    return {
      sent: result.sent?.length > 0,
      env: production ? "production" : "sandbox",
      topic,
      failed,
      reason: failed[0]?.response?.reason,
    };
  } finally {
    provider.shutdown();
  }
}

function envOrder(user) {
  if (user?.voipApnsEnv === "production") return [true, false];
  if (user?.voipApnsEnv === "sandbox") return [false, true];
  if (String(process.env.APNS_PRODUCTION || "").toLowerCase() === "true") return [true, false];
  return [false, true];
}

async function sendVoip(token, payload, user) {
  const auth = apnAuth();
  if (!auth) {
    console.warn("APNs VoIP not configured (APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID)");
    return { sent: false, reason: "missing-apns" };
  }
  const device = normalizePushToken(token);
  if (!device || device.length < 32) {
    return { sent: false, reason: "bad-token-format" };
  }
  if (user?.devicePushToken && normalizePushToken(user.devicePushToken) === device) {
    console.warn("Skipping VoIP send: stored voip token matches regular APNs device token");
    return { sent: false, reason: "not-a-voip-token" };
  }

  let last = null;
  let skipProduction = user?.voipApnsEnv === "sandbox";
  for (const topic of topicFallbacks(user || {})) {
    for (const production of envOrder(user || {})) {
      if (production && skipProduction) continue;
      last = await sendVoipOnce(device, payload, production, topic);
      if (last.sent) {
        console.log("VoIP sent", { env: last.env, topic });
        return last;
      }
      console.warn("VoIP attempt failed", {
        env: last.env,
        topic,
        reason: last.reason,
      });
      if (last.reason === "BadEnvironmentKeyInToken") {
        skipProduction = true;
      }
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
    results.voip = await sendVoip(user.voipPushToken, payload, user);
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
