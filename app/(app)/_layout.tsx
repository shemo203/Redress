import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { theme } from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import { AppDock } from "../../src/ui";

export default function AppLayout() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <View style={styles.appShell}>
      <View style={styles.contentWrap}>
        <Slot />
      </View>
      <AppDock />
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    backgroundColor: theme.color.shell,
    flex: 1,
  },
  contentWrap: {
    flex: 1,
    paddingBottom: 66,
  },
  loaderWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
