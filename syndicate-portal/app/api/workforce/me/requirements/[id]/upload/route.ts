import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { workforceService } from "@/lib/server/workforce/service";
import { WorkforceDocumentUploadResponseSchema } from "@/lib/types/workforce";

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession(["tenant.onboarding.update_own", "tenant.onboarding.read_own"]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File exceeds size limit" }, { status: 400 });
    }

    const { id } = await params;
    const response = await workforceService.uploadOwnDocument(me, id, {
      name: file.name,
      type: file.type,
      bytes: Buffer.from(await file.arrayBuffer())
    });

    return NextResponse.json(WorkforceDocumentUploadResponseSchema.parse(response));
  } catch (error) {
    return safeRouteError(error);
  }
}
