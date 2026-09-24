import { FormScaffold, formStyles } from "@/components/FormScaffold";
import { router } from "expo-router";
import { Text } from "react-native";

export default function ChatNewScreen() {
  return (
    <FormScaffold title="Inbox" onClose={() => router.back()}>
      <Text style={formStyles.hint}>
        Dealership replies about vehicles you’re looking for show up in Inbox.
      </Text>
    </FormScaffold>
  );
}
