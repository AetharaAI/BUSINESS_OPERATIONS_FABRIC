export const unwrapVoiceOpsPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const root = payload as Record<string, unknown>;
  if ("data" in root && root.data !== undefined) {
    return root.data;
  }

  return payload;
};
