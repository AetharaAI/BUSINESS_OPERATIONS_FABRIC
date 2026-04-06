const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

export const serverEnv = {
  voiceOpsApiBaseUrl: process.env.VOICEOPS_API_BASE_URL || "https://voice.aetherpro.us",
  cookieSecure: parseBool(process.env.PORTAL_COOKIE_SECURE, process.env.NODE_ENV === "production")
};
