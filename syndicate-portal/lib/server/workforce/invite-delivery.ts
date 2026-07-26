import { serverEnv } from "@/lib/server/env";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";

export type WorkforceInviteDeliveryMode = "email" | "direct_link" | "both";

export type WorkforceInviteDeliveryResult = {
  delivery_mode: WorkforceInviteDeliveryMode;
  invite_url: string | null;
  status: "email_sent" | "direct_link_ready" | "email_sent_and_direct_link_ready";
};

type WorkforceInviteDispatchMetadata = {
  onboardingCaseId?: string;
};

const buildInviteUrl = (resetToken: string | null): string | null => {
  if (!resetToken || !serverEnv.portalPublicBaseUrl) {
    return null;
  }

  return `${serverEnv.portalPublicBaseUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;
};

const requestDirectResetToken = async (email: string, metadata?: WorkforceInviteDispatchMetadata): Promise<string | null> => {
  if (!serverEnv.voiceOpsPlatformAdminKey) {
    throw new Error("Missing VOICEOPS_PLATFORM_ADMIN_KEY in portal environment");
  }

  const payload = await voiceOpsRequest<{ reset_token?: string | null }>({
    method: "POST",
    path: "/api/v1/auth/forgot-password",
    headers: {
      "x-platform-admin-key": serverEnv.voiceOpsPlatformAdminKey,
      ...(metadata?.onboardingCaseId ? { "x-workforce-case-id": metadata.onboardingCaseId } : {})
    },
    body: { email }
  });

  return payload && typeof payload === "object" && "reset_token" in payload ? (payload.reset_token ?? null) : null;
};

export const dispatchWorkforceInvite = async (
  email: string,
  mode: WorkforceInviteDeliveryMode = serverEnv.workforceInviteDeliveryMode,
  metadata?: WorkforceInviteDispatchMetadata
): Promise<WorkforceInviteDeliveryResult> => {
  if (mode === "email" || mode === "both") {
    await voiceOpsRequest<unknown>({
      method: "POST",
      path: "/api/v1/auth/forgot-password",
      headers: metadata?.onboardingCaseId ? { "x-workforce-case-id": metadata.onboardingCaseId } : undefined,
      body: { email }
    });
  }

  if (mode === "direct_link") {
    const resetToken = await requestDirectResetToken(email, metadata);
    return {
      delivery_mode: mode,
      invite_url: buildInviteUrl(resetToken),
      status: "direct_link_ready"
    };
  }

  if (mode === "both") {
    const resetToken = await requestDirectResetToken(email, metadata);
    return {
      delivery_mode: mode,
      invite_url: buildInviteUrl(resetToken),
      status: "email_sent_and_direct_link_ready"
    };
  }

  return {
    delivery_mode: "email",
    invite_url: null,
    status: "email_sent"
  };
};
