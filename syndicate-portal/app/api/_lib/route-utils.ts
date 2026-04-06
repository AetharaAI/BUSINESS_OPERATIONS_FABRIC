import { NextResponse } from "next/server";
import { VoiceOpsError } from "@/lib/server/voiceops-client";

export const unauthorized = (): NextResponse =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const safeRouteError = (error: unknown): NextResponse => {
  if (error instanceof VoiceOpsError) {
    return NextResponse.json(
      {
        error: "VoiceOps request failed",
        status: error.status,
        details: error.details
      },
      { status: error.status }
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
};
