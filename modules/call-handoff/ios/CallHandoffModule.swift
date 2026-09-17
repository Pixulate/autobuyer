import ExpoModulesCore
import UIKit

public class CallHandoffModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CallHandoff")

    AsyncFunction("handoffToNativeCall") { (_uuid: String) in
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
        UIControl().sendAction(Selector(("suspend")), to: UIApplication.shared, for: nil)
      }
    }
  }
}
