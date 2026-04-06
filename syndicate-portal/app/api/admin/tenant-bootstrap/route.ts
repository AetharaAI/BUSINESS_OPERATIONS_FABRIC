import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireAdminSession } from "@/lib/server/admin-auth";
import { serverEnv } from "@/lib/server/env";
import { createInviteToken, generateTemporaryPassword } from "@/lib/server/invite-tokens";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import { AdminTenantBootstrapRequestSchema } from "@/lib/types/portal";
import { billingStateStore } from "@/lib/server/billing-state-store";

const extractTenantId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const root = payload as Record<string, unknown>;
  if (typeof root.id === "string") return root.id;
  if (typeof root.tenant_id === "string") return root.tenant_id;

  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    if (typeof data.id === "string") return data.id;
    if (typeof data.tenant_id === "string") return data.tenant_id;
  }

  return null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdminSession();

    if (!serverEnv.voiceOpsPlatformAdminKey) {
      return NextResponse.json(
        { error: "Missing VOICEOPS_PLATFORM_ADMIN_KEY in portal environment" },
        { status: 500 }
      );
    }

    const parsedBody = AdminTenantBootstrapRequestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsedBody.error.flatten() }, { status: 400 });
    }

    const body = parsedBody.data;
    const tenantCreateResponse = await voiceOpsRequest<unknown>({
      method: "POST",
      path: "/api/v1/tenants",
      headers: { "x-platform-admin-key": serverEnv.voiceOpsPlatformAdminKey },
      body: {
        name: body.tenant_name,
        slug: body.tenant_slug
      }
    });

    const tenantId = extractTenantId(tenantCreateResponse);
    if (!tenantId) {
      return NextResponse.json({ error: "Unable to determine tenant_id from VoiceOps response" }, { status: 502 });
    }

    const temporaryPassword = generateTemporaryPassword();
    await voiceOpsRequest<unknown>({
      method: "POST",
      path: "/api/v1/auth/bootstrap",
      headers: { "x-platform-admin-key": serverEnv.voiceOpsPlatformAdminKey },
      body: {
        tenant_id: tenantId,
        email: body.owner_email,
        full_name: body.owner_full_name,
        role: "owner",
        password: temporaryPassword,
        force_password_change: true
      }
    });

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const inviteToken = createInviteToken({
      email: body.owner_email,
      full_name: body.owner_full_name,
      tenant_id: tenantId,
      role: "owner",
      temp_password: temporaryPassword,
      expires_at: expiresAt
    });
    const inviteUrl = `${request.nextUrl.origin}/activate?token=${encodeURIComponent(inviteToken)}`;

    billingStateStore.ensureForTenant({
      tenant_id: tenantId,
      tenant_name: body.tenant_name,
      selected_plan: "starter"
    });

    return NextResponse.json({
      tenant_id: tenantId,
      owner_email: body.owner_email,
      temporary_password: temporaryPassword,
      invite_token: inviteToken,
      invite_url: inviteUrl
    });
  } catch (error) {
    return safeRouteError(error);
  }
}
