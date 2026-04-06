import { serverEnv } from "@/lib/server/env";

export class VoiceOpsError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "VoiceOpsError";
    this.status = status;
    this.details = details;
  }
}

const joinUrl = (base: string, path: string): string => {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const voiceOpsRequest = async <TResponse>(params: {
  method: "GET" | "PUT" | "POST";
  path: string;
  token?: string | null;
  body?: unknown;
}): Promise<TResponse> => {
  const response = await fetch(joinUrl(serverEnv.voiceOpsApiBaseUrl, params.path), {
    method: params.method,
    headers: {
      "Content-Type": "application/json",
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {})
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    let details: unknown;

    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    throw new VoiceOpsError(`VoiceOps request failed: ${params.path}`, response.status, details);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
};

export const extractAccessToken = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const obj = payload as Record<string, unknown>;

  if (typeof obj.access_token === "string") {
    return obj.access_token;
  }

  if (typeof obj.token === "string") {
    return obj.token;
  }

  const nestedData = obj.data;
  if (nestedData && typeof nestedData === "object") {
    const nested = nestedData as Record<string, unknown>;
    if (typeof nested.access_token === "string") {
      return nested.access_token;
    }
    if (typeof nested.token === "string") {
      return nested.token;
    }
  }

  return null;
};
