import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/server/session";
import { voiceOpsRequest } from "@/lib/server/voiceops-client";
import {
  PortalAgentModeResponseSchema,
  PortalAgentModeUpdateSchema
} from "@/lib/types/portal";
import { safeRouteError, unauthorized } from "@/app/api/_lib/route-utils";
import { unwrapVoiceOpsPayload } from "@/lib/server/response-shape";

export async function GET(): Promise<NextResponse> {
  try {
    const token = await readSessionToken();

    if (!token) {
      return unauthorized();
    }

    const payload = await voiceOpsRequest<unknown>({
      method: "GET",
      path: "/api/v1/portal/agent-mode",
      token
    });

    const parsed = PortalAgentModeResponseSchema.safeParse(unwrapVoiceOpsPayload(payload));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid agent mode response from VoiceOps", details: parsed.error.flatten() },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return safeRouteError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await readSessionToken();

    if (!token) {
      return unauthorized();
    }

    const parsedUpdate = PortalAgentModeUpdateSchema.safeParse(await request.json());
    if (!parsedUpdate.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsedUpdate.error.flatten() },
        { status: 400 }
      );
    }

    const payload = await voiceOpsRequest<unknown>({
      method: "PUT",
      path: "/api/v1/portal/agent-mode",
      token,
      body: parsedUpdate.data
    });

    const parsed = PortalAgentModeResponseSchema.safeParse(unwrapVoiceOpsPayload(payload));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid agent mode response from VoiceOps", details: parsed.error.flatten() },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    return safeRouteError(error);
  }
}
