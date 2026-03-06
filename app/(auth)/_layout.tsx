import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../../src/features/auth";

export default function AuthLayout() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loaderWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
