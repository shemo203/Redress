import { Slot } from "expo-router";

import * as Sentry from "@sentry/react-native";
import { AuthProvider } from "../src/features/auth";

Sentry.init({
  dsn: "https://d2cabda35d4338bdb76081018de75d20@o4511300239032320.ingest.de.sentry.io/4511300274618448",

  // Keep beta telemetry privacy-conscious until we explicitly choose richer identity capture.
  sendDefaultPii: false,

  // Enable Logs
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
});
