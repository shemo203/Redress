import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../src/features/auth";

export default function HomeScreen() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={session ? "/feed" : "/sign-in"} />;
}

const styles = StyleSheet.create({
  loaderWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
