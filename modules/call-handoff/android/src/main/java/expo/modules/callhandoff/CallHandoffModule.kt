package expo.modules.callhandoff

import android.content.Context
import android.os.Build
import android.telecom.TelecomManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CallHandoffModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CallHandoff")

    AsyncFunction("handoffToNativeCall") { _uuid: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val telecom = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager ?: return@AsyncFunction
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        telecom.showInCallScreen(false)
      }
    }
  }
}
