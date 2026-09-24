import * as Crypto from "expo-crypto";
import { NativeModules, Platform } from "react-native";
import { reportError } from "@/lib/errors";
import { handoffToNativeCall } from "@/modules/call-handoff";

type CallKeepModule = {
  setup: (options: object) => Promise<boolean>;
  registerPhoneAccount: (options: object) => void;
  registerAndroidEvents: () => void;
  setAvailable: (active: boolean) => void;
  displayIncomingCall: (
    uuid: string,
    handle: string,
    name?: string,
    handleType?: string,
    hasVideo?: boolean
  ) => void;
  startCall: (
    uuid: string,
    handle: string,
    contactIdentifier?: string,
    handleType?: string,
    hasVideo?: boolean
  ) => void;
  reportConnectingOutgoingCallWithUUID: (uuid: string) => void;
  reportConnectedOutgoingCallWithUUID: (uuid: string) => void;
  endCall: (uuid: string) => void;
  rejectCall: (uuid: string) => void;
  setCurrentCallActive: (uuid: string) => void;
  answerIncomingCall?: (uuid: string) => void;
  backToForeground: () => void;
  getInitialEvents?: () => Promise<Array<{ name: string; data?: { callUUID?: string } }>>;
  addEventListener: (type: string, handler: (args: { callUUID?: string }) => void) => { remove?: () => void };
  removeEventListener: (type: string) => void;
};

const OPTIONS = {
  ios: {
    appName: "Carloop",
    supportsVideo: false,
    maximumCallGroups: "1",
    maximumCallsPerCallGroup: "1",
    includesCallsInRecents: true,
  },
  android: {
    alertTitle: "Phone account for Carloop",
    alertDescription: "Allow Carloop to show native incoming and outgoing calls.",
    cancelButton: "Cancel",
    okButton: "Allow",
    additionalPermissions: [],
    selfManaged: false,
    foregroundService: {
      channelId: "incoming-calls",
      channelName: "Incoming calls",
      notificationTitle: "Carloop call",
    },
  },
};

const uuidByCallId = new Map<string, string>();
const callIdByUuid = new Map<string, string>();
let ready = false;
let keep: CallKeepModule | null = null;
let ignoreEndEvent = false;

function makeUuid() {
  const bytes = Crypto.getRandomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function bindCallUuid(callId: string, uuid = makeUuid()) {
  uuidByCallId.set(callId, uuid);
  callIdByUuid.set(uuid.toLowerCase(), callId);
  return uuid;
}

export function uuidForCall(callId: string) {
  return uuidByCallId.get(callId) ?? bindCallUuid(callId);
}

export function callIdForUuid(uuid: string) {
  return callIdByUuid.get(uuid.toLowerCase());
}

export function hasNativeCalling() {
  return ready && keep != null && Platform.OS !== "web";
}

function loadCallKeep(): CallKeepModule | null {
  if (Platform.OS === "web") return null;
  if (!NativeModules.RNCallKeep) {
    console.warn("[Carloop] RNCallKeep native module missing. Rebuild the dev client after adding CallKeep.");
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react-native-callkeep").default as CallKeepModule;
}

export async function setupNativeCalling() {
  if (Platform.OS === "web" || ready) {
    return hasNativeCalling();
  }
  try {
    keep = loadCallKeep();
    if (!keep) return false;
    await keep.setup(OPTIONS);
    if (Platform.OS === "android") {
      keep.registerPhoneAccount(OPTIONS);
      keep.registerAndroidEvents();
      keep.setAvailable(true);
    }
    ready = true;
    keep.addEventListener("didDisplayIncomingCall", (args: { callUUID?: string; payload?: { callId?: string } }) => {
      const callId = args?.payload?.callId;
      if (callId && args.callUUID) bindCallUuid(String(callId), args.callUUID);
    });
    keep.addEventListener("didReceiveStartCallAction", (args: { callUUID?: string }) => {
      if (args.callUUID) presentNativeCallUi(args.callUUID);
    });
    console.log("[Carloop] Native calling (CallKit / ConnectionService) is ready.");
    return true;
  } catch (error) {
    reportError("Setting up native calling", error, { alert: false });
    keep = null;
    ready = false;
    return false;
  }
}

function presentNativeCallUi(uuid: string) {
  if (!keep) return;
  keep.reportConnectingOutgoingCallWithUUID?.(uuid);
  void handoffToNativeCall(uuid);
}

export function showNativeIncoming(callId: string, callerName: string, nativeUuid?: string) {
  if (!hasNativeCalling() || !keep) return false;
  const uuid = nativeUuid ? bindCallUuid(callId, nativeUuid) : uuidForCall(callId);
  try {
    keep.displayIncomingCall(uuid, callerName || "Carloop", callerName || "Dealer", "generic", false);
    return true;
  } catch (error) {
    reportError("Showing native incoming call", error, { alert: false });
    return false;
  }
}

export function startNativeOutgoing(callId: string, calleeName: string, nativeUuid?: string) {
  if (!hasNativeCalling() || !keep) return false;
  const uuid = nativeUuid ? bindCallUuid(callId, nativeUuid) : uuidForCall(callId);
  const name = calleeName || "Dealer";
  try {
    keep.startCall(uuid, name, name, "generic", false);
    presentNativeCallUi(uuid);
    return true;
  } catch (error) {
    reportError("Starting native outgoing call", error, { alert: false });
    return false;
  }
}

export function setNativeCallConnected(callId: string) {
  if (!hasNativeCalling() || !keep) return;
  const uuid = uuidByCallId.get(callId);
  if (!uuid) return;
  try {
    keep.answerIncomingCall?.(uuid);
    keep.reportConnectedOutgoingCallWithUUID?.(uuid);
    keep.setCurrentCallActive(uuid);
    setTimeout(() => {
      void handoffToNativeCall(uuid);
    }, 250);
  } catch (error) {
    reportError("Marking native call active", error, { alert: false });
  }
}

export function endNativeCall(callId: string) {
  if (!keep) return;
  const uuid = uuidByCallId.get(callId);
  if (!uuid) return;
  ignoreEndEvent = true;
  try {
    keep.endCall(uuid);
  } catch (error) {
    reportError("Ending native call UI", error, { alert: false });
  }
  setTimeout(() => {
    ignoreEndEvent = false;
  }, 400);
}

export function onNativeAnswer(handler: (callId: string) => void) {
  if (!keep) return () => undefined;
  const replay = (callUUID?: string) => {
    const id = callUUID ? callIdForUuid(callUUID) ?? callUUID : undefined;
    if (id) handler(id);
  };
  keep.addEventListener("answerCall", ({ callUUID }) => replay(callUUID));
  keep.addEventListener("didLoadWithEvents", ((events: unknown) => {
    const list = Array.isArray(events) ? events : [];
    for (const event of list as Array<{ name?: string; data?: { callUUID?: string; payload?: { callId?: string } } }>) {
      const uuid = event.data?.callUUID;
      const mapped = event.data?.payload?.callId;
      if (mapped && uuid) bindCallUuid(mapped, uuid);
      if (event?.name === "RNCallKeepPerformAnswerCallAction" && uuid) {
        replay(uuid);
      }
    }
  }) as (args: { callUUID?: string }) => void);
  keep.getInitialEvents?.().then((events) => {
    for (const event of events ?? []) {
      if (event?.name === "RNCallKeepPerformAnswerCallAction" && event.data?.callUUID) {
        replay(event.data.callUUID);
      }
    }
  });
  return () => {
    keep?.removeEventListener("answerCall");
    keep?.removeEventListener("didLoadWithEvents");
  };
}

export function onNativeEnd(handler: (callId: string) => void) {
  if (!keep) return () => undefined;
  keep.addEventListener("endCall", ({ callUUID }) => {
    if (ignoreEndEvent) return;
    const id = callUUID ? callIdForUuid(callUUID) ?? callUUID : undefined;
    if (id) handler(id);
  });
  return () => keep?.removeEventListener("endCall");
}
