import { NextRequest, NextResponse } from "next/server";
import { safeRouteError } from "@/app/api/_lib/route-utils";
import { requireWorkforceSession } from "@/lib/server/admin-auth";
import { resolveCrmRequestContext } from "@/lib/server/crm/request-context";
import { crmService } from "@/lib/server/crm/service";
import { CreateContactRequestSchema } from "@/lib/types/crm";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { me } = await requireWorkforceSession("contact.create");
    const parsed = CreateContactRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const context = resolveCrmRequestContext(parsed.data, me);
    const contact = await crmService.createContact(context, me, {
      companyId: parsed.data.company_id,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      title: parsed.data.title,
      notes: parsed.data.notes
    });
    return NextResponse.json(contact);
  } catch (error) {
    return safeRouteError(error);
  }
}
