export const TERMS_URL = "/terms" as const;
export const PRIVACY_URL = "/privacy" as const;

export const isGoogleAuthConfigured =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export const googleAuthRedirectUrl =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URL;
