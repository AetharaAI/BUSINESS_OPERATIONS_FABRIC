import { NextResponse } from "next/server";
import { clearSessionToken } from "@/lib/server/session";

export async function POST(): Promise<NextResponse> {
  await clearSessionToken();
  return NextResponse.json({ ok: true });
}
