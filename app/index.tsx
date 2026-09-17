import { BrandLogo } from "@/components/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function Splash() {
  return (
    <SafeAreaView
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#06102A",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        <BrandLogo height={40} />
      </View>
    </SafeAreaView>
  );
}

export default function Index() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <Splash />;
  }

  if (user) {
    return <Redirect href="/home" />;
  }

  return <Redirect href="/onboarding" />;
}
