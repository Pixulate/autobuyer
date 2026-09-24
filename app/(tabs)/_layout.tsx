import { AppTabBar } from "@/components/AppTabBar";
import { useAuth } from "@/lib/auth";
import { Redirect, Tabs } from "expo-router";

export default function TabsLayout() {
  const { user, ready } = useAuth();

  if (!ready) {
    return null;
  }

  if (!user) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="messages" options={{ title: "Inbox" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
