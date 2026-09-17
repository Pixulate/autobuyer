const fs = require("fs");
const path = require("path");
const {
  createRunOncePlugin,
  withAppDelegate,
  withAndroidManifest,
  withDangerousMod,
  withXcodeProject,
  AndroidConfig,
} = require("expo/config-plugins");

const SWIFT_METHODS = `
  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    RNVoipPushNotificationManager.didUpdate(pushCredentials, forType: type.rawValue)
  }

  public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {}

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    let dict = payload.dictionaryPayload
    let uuid = (dict["uuid"] as? String)
      ?? (dict["nativeUuid"] as? String)
      ?? UUID().uuidString
    let callerName = (dict["callerName"] as? String)
      ?? (dict["caller"] as? String)
      ?? "Carloop"
    let handle = (dict["handle"] as? String) ?? "Carloop"
    let extra: [AnyHashable: Any] = [
      "uuid": uuid,
      "callId": dict["callId"] ?? "",
      "callerName": callerName,
      "type": "incoming-call",
    ]
    RNVoipPushNotificationManager.didReceiveIncomingPush(with: payload, forType: type.rawValue)
    RNCallKeep.reportNewIncomingCall(
      uuid,
      handle: handle,
      handleType: "generic",
      hasVideo: false,
      localizedCallerName: callerName,
      supportsHolding: true,
      supportsDTMF: true,
      supportsGrouping: true,
      supportsUngrouping: true,
      fromPushKit: true,
      payload: extra,
      withCompletionHandler: completion
    )
  }
`;

function withIosVoipAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      return config;
    }
    let src = config.modResults.contents;
    if (!src.includes("import PushKit")) {
      src = src.replace("import Expo\n", "import Expo\nimport PushKit\n");
    }
    src = src.replace(
      /public class AppDelegate: ExpoAppDelegate(?!, PKPushRegistryDelegate)/,
      "public class AppDelegate: ExpoAppDelegate, PKPushRegistryDelegate"
    );
    if (!src.includes("RNVoipPushNotificationManager.voipRegistration()")) {
      src = src.replace(
        "bindReactNativeFactory(factory)",
        `bindReactNativeFactory(factory)
    RNVoipPushNotificationManager.voipRegistration()
    RNCallKeep.setup([
      "appName": "Carloop",
      "supportsVideo": false,
      "maximumCallGroups": "1",
      "maximumCallsPerCallGroup": "1",
      "includesCallsInRecents": true,
    ])`
      );
    }
    if (!src.includes("didReceiveIncomingPushWith")) {
      src = src.replace(
        /return super\.application\(application, continue: userActivity, restorationHandler: restorationHandler\) \|\| result\n  \}\n\}/,
        `return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
${SWIFT_METHODS}
}`
      );
    }
    config.modResults.contents = src;
    return config;
  });
}

function withAndroidCallUi(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
    "android.permission.FOREGROUND_SERVICE_MICROPHONE",
    "android.permission.USE_FULL_SCREEN_INTENT",
    "android.permission.MANAGE_OWN_CALLS",
  ]);
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    if (!Array.isArray(app.service)) app.service = [];
    const voice = app.service.find(
      (item) => item.$["android:name"] === "io.wazo.callkeep.VoiceConnectionService"
    );
    if (voice) {
      voice.$["android:label"] = "Carloop";
      voice.$["android:foregroundServiceType"] = "phoneCall|microphone";
    }
    return config;
  });
}

function withBridgingHeader(config) {
  config = withDangerousMod(config, [
    "ios",
    async (mod) => {
      const projectName = mod.modRequest.projectName || "AutoQuest";
      const headerPath = path.join(
        mod.modRequest.platformProjectRoot,
        projectName,
        `${projectName}-Bridging-Header.h`
      );
      const extra = '#import "RNCallKeep.h"\n#import "RNVoipPushNotificationManager.h"\n';
      let existing = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, "utf8") : "";
      if (!existing.includes("RNCallKeep.h")) {
        fs.mkdirSync(path.dirname(headerPath), { recursive: true });
        fs.writeFileSync(headerPath, `${existing.trim()}\n${extra}`);
      }
      return mod;
    },
  ]);
  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const configs = project.pbxXCBuildConfigurationSection();
    const voipHeaders = `"$(SRCROOT)/../node_modules/react-native-voip-push-notification/ios/RNVoipPushNotification"`;
    Object.values(configs).forEach((entry) => {
      if (!entry.buildSettings) return;
      const product = String(entry.buildSettings.PRODUCT_NAME || "");
      if (product.includes("Pods") || product.includes("React")) return;
      if (!entry.buildSettings.SWIFT_OBJC_BRIDGING_HEADER) {
        entry.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = `${mod.modRequest.projectName}/${mod.modRequest.projectName}-Bridging-Header.h`;
      }
      const paths = entry.buildSettings.HEADER_SEARCH_PATHS;
      if (Array.isArray(paths) && !paths.includes(voipHeaders)) {
        paths.push(voipHeaders);
      }
    });
    return mod;
  });
}

function withVoipCallKeep(config) {
  config = withIosVoipAppDelegate(config);
  config = withBridgingHeader(config);
  config = withAndroidCallUi(config);
  return config;
}

module.exports = createRunOncePlugin(withVoipCallKeep, "withVoipCallKeep", "1.0.0");
