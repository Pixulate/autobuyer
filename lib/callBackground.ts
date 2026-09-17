import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { setupNativeCalling, showNativeIncoming, bindCallUuid } from "@/lib/nativeCall";

export const CALL_NOTIFICATION_TASK = "AQ_INCOMING_CALL";

TaskManager.defineTask(CALL_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[Carloop] Incoming-call background task", error);
    return;
  }
  const payload =
    (data as { notification?: { request?: { content?: { data?: Record<string, string> } } } })
      ?.notification?.request?.content?.data ??
    (data as { data?: Record<string, string> }).data;
  if (!payload || payload.type !== "incoming-call" || !payload.callId) {
    return;
  }
  await setupNativeCalling();
  if (payload.nativeUuid) {
    bindCallUuid(String(payload.callId), String(payload.nativeUuid));
  }
  showNativeIncoming(
    String(payload.callId),
    String(payload.callerName || "Dealer"),
    payload.nativeUuid ? String(payload.nativeUuid) : undefined
  );
});

export async function registerCallBackgroundTask() {
  try {
    await Notifications.registerTaskAsync(CALL_NOTIFICATION_TASK);
  } catch (error) {
    console.warn("[Carloop] Could not register background call task", error);
  }
}
