export const TERMS_URL = "https://example.com/terms";
export const PRIVACY_URL = "https://example.com/privacy";

export const isGoogleAuthConfigured =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export const googleAuthRedirectUrl =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_REDIRECT_URL;
