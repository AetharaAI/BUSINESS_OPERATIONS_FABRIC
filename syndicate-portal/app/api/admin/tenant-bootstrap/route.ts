import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireAdminSession } from "@/lib/server/admin-auth";
import { serverEnv } from "@/lib/server/env";
import { createInviteToken, generateTemporaryPassword } from "@/lib/server/invite-tokens";
import { extractAccessToken, VoiceOpsError, voiceOpsRequest } from "@/lib/server/voiceops-client";
import { AdminTenantBootstrapRequestSchema } from "@/lib/types/portal";
import { billingStateStore } from "@/lib/server/billing-state-store";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

const extractString = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

const extractTenantId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  return (
    extractString(root.tenant_id) ??
    extractString(root.id) ??
    (root.tenant && typeof root.tenant === "object"
      ? extractString((root.tenant as Record<string, unknown>).id) ??
        extractString((root.tenant as Record<string, unknown>).tenant_id)
      : null)
  );
};

const extractPasswordResetToken = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  return (
    extractString(root.password_reset_token) ??
    extractString(root.reset_token) ??
    (root.owner && typeof root.owner === "object"
      ? extractString((root.owner as Record<string, unknown>).password_reset_token) ??
        extractString((root.owner as Record<string, unknown>).reset_token)
      : null)
  );
};

const extractOwnerEmail = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const root = payload as Record<string, unknown>;
  return (
    extractString(root.owner_email) ??
    extractString(root.email) ??
    (root.owner && typeof root.owner === "object"
      ? extractString((root.owner as Record<string, unknown>).email) ??
        extractString((root.owner as Record<string, unknown>).owner_email)
      : null) ??
    fallback
  );
};

const buildLegacyInvite = (params: {
  ownerEmail: string;
  ownerFullName: string;
  tenantId: string;
  temporaryPassword: string;
  origin: string;
}) => {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const inviteToken = createInviteToken({
    email: params.ownerEmail,
    full_name: params.ownerFullName,
    tenant_id: params.tenantId,
    role: "owner",
    temp_password: params.temporaryPassword,
    expires_at: expiresAt
  });

  return {
    inviteToken,
    inviteUrl: `${params.origin}/activate?token=${encodeURIComponent(inviteToken)}`
  };
};

const legacyBootstrapFallback = async (params: {
  tenantName: string;
  tenantSlug: string;
  ownerEmail: string;
  ownerFullName: string;
  platformAdminKey: string;
  origin: string;
}) => {
  const temporaryPassword = generateTemporaryPassword();
  const bootstrapPayload = await voiceOpsRequest<unknown>({
    method: "POST",
    path: "/api/v1/auth/bootstrap",
    headers: { "x-platform-admin-key": params.platformAdminKey },
    body: {
      tenant_name: params.tenantName,
      tenant_slug: params.tenantSlug,
      email: params.ownerEmail,
      full_name: params.ownerFullName,
      password: temporaryPassword
    }
  });

  const bootstrapToken = extractAccessToken(bootstrapPayload);
  if (!bootstrapToken) {
    throw new Error("Bootstrap succeeded but no access token returned by VoiceOps");
  }

  const tenantMePayload = await voiceOpsRequest<unknown>({
    method: "GET",
    path: "/api/v1/tenants/me",
    token: bootstrapToken
  });
  const tenantId = extractTenantId(unwrapVoiceOpsPayload(tenantMePayload));
  if (!tenantId) {
    throw new Error("Unable to determine tenant_id from VoiceOps tenant context");
  }

  const { inviteToken, inviteUrl } = buildLegacyInvite({
    ownerEmail: params.ownerEmail,
    ownerFullName: params.ownerFullName,
    tenantId,
    temporaryPassword,
    origin: params.origin
  });

  return {
    tenantId,
    ownerEmail: params.ownerEmail,
    temporaryPassword,
    passwordResetToken: null as string | null,
    inviteToken,
    inviteUrl
  };
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdminSession();

    if (!serverEnv.voiceOpsPlatformAdminKey) {
      return NextResponse.json({ error: "Missing VOICEOPS_PLATFORM_ADMIN_KEY in portal environment" }, { status: 500 });
    }

    const parsedBody = AdminTenantBootstrapRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsedBody.error.flatten() }, { status: 400 });
    }

    const body = parsedBody.data;

    let result:
      | {
          tenantId: string;
          ownerEmail: string;
          temporaryPassword: string | null;
          passwordResetToken: string | null;
          inviteToken: string | null;
          inviteUrl: string | null;
        }
      | null = null;

    try {
      const newPayload = await voiceOpsRequest<unknown>({
        method: "POST",
        path: "/api/v1/admin/tenant-bootstrap",
        headers: { "x-platform-admin-key": serverEnv.voiceOpsPlatformAdminKey },
        body: {
          tenant_name: body.tenant_name,
          owner_full_name: body.owner_full_name,
          owner_email: body.owner_email
        }
      });

      const unwrapped = unwrapVoiceOpsPayload(newPayload);
      const tenantId = extractTenantId(unwrapped);
      if (!tenantId) {
        throw new Error("Unable to determine tenant_id from /api/v1/admin/tenant-bootstrap response");
      }

      const passwordResetToken = extractPasswordResetToken(unwrapped);
      const ownerEmail = extractOwnerEmail(unwrapped, body.owner_email);
      const inviteUrl = passwordResetToken
        ? `${request.nextUrl.origin}/reset-password?token=${encodeURIComponent(passwordResetToken)}`
        : null;

      result = {
        tenantId,
        ownerEmail,
        temporaryPassword: null,
        passwordResetToken,
        inviteToken: null,
        inviteUrl
      };
    } catch (error) {
      // Compatibility fallback: if VoiceOps does not yet expose /api/v1/admin/tenant-bootstrap,
      // keep portal onboarding functional via legacy bootstrap semantics.
      if (error instanceof VoiceOpsError && (error.status === 404 || error.status === 405)) {
        const tenantSlug =
          body.tenant_slug ??
          body.tenant_name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        result = await legacyBootstrapFallback({
          tenantName: body.tenant_name,
          tenantSlug,
          ownerEmail: body.owner_email,
          ownerFullName: body.owner_full_name,
          platformAdminKey: serverEnv.voiceOpsPlatformAdminKey,
          origin: request.nextUrl.origin
        });
      } else {
        throw error;
      }
    }

    if (!result) {
      return NextResponse.json({ error: "Tenant bootstrap did not return a result" }, { status: 500 });
    }

    billingStateStore.ensureForTenant({
      tenant_id: result.tenantId,
      tenant_name: body.tenant_name,
      selected_plan: "starter"
    });

    return NextResponse.json({
      tenant_id: result.tenantId,
      owner_email: result.ownerEmail,
      temporary_password: result.temporaryPassword,
      password_reset_token: result.passwordResetToken,
      invite_token: result.inviteToken,
      invite_url: result.inviteUrl
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
