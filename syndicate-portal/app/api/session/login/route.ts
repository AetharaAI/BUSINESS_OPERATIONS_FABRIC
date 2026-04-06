import { NextRequest, NextResponse } from "next/server";
import { writeSessionToken } from "@/lib/server/session";
import { extractAccessToken, voiceOpsRequest } from "@/lib/server/voiceops-client";
import { safeRouteError } from "@/app/api/_lib/route-utils";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    const payload = await voiceOpsRequest<unknown>({
      method: "POST",
      path: "/api/v1/auth/login",
      body: {
        email: body.email,
        password: body.password
      }
    });

    const token = extractAccessToken(payload);

    if (!token) {
      return NextResponse.json({ error: "Login response did not include an access token" }, { status: 502 });
    }

    await writeSessionToken(token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeRouteError(error);
  }
}
