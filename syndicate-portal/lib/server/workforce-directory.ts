import { z } from "zod";
import { serverEnv } from "@/lib/server/env";
import {
  WorkforceRole,
  defaultCapabilityScopeForRole,
  defaultTenantScopeModeForRole,
  deriveHandleFromEmail,
  normalizeCapabilityScope,
  normalizeTenantScopeMode,
  normalizeWorkforceRole
} from "@/lib/shared/workforce-auth";
import { SessionMe } from "@/lib/types/portal";

const WorkforceDirectoryEntrySchema = z.object({
  email: z.string().email().optional(),
  user_id: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
  workforce_role: z.string().min(1),
  capability_scope: z.array(z.string()).optional(),
  tenant_scope_mode: z.string().optional()
});

type WorkforceDirectoryEntry = z.infer<typeof WorkforceDirectoryEntrySchema>;

type ResolvedWorkforceIdentity = {
  subject: string | null;
  handle: string | null;
  workforce_role: WorkforceRole;
  capability_scope: string[];
  tenant_scope_mode: string;
};

const parseDirectory = (): WorkforceDirectoryEntry[] => {
  if (!serverEnv.portalWorkforceDirectoryJson) {
    return [];
  }

  try {
    const raw = JSON.parse(serverEnv.portalWorkforceDirectoryJson) as unknown;
    const parsed = z.array(WorkforceDirectoryEntrySchema).safeParse(raw);
    if (!parsed.success) {
      console.error("[portal-authz] invalid PORTAL_WORKFORCE_DIRECTORY_JSON", parsed.error.flatten());
      return [];
    }

    return parsed.data;
  } catch (error) {
    console.error("[portal-authz] failed to parse PORTAL_WORKFORCE_DIRECTORY_JSON", error);
    return [];
  }
};

const findDirectoryEntry = (me: SessionMe, raw: Record<string, unknown>): WorkforceDirectoryEntry | null => {
  const normalizedEmail = me.email?.trim().toLowerCase() ?? null;
  const normalizedHandle = (typeof raw.handle === "string" ? raw.handle : me.handle)?.trim().toLowerCase() ?? deriveHandleFromEmail(me.email);
  const subject = (typeof raw.subject === "string" ? raw.subject : null) ?? (typeof raw.sub === "string" ? raw.sub : null) ?? me.subject ?? null;
  const userId = me.user_id ?? null;

  for (const entry of parseDirectory()) {
    if (entry.user_id && userId && entry.user_id === userId) {
      return entry;
    }
    if (entry.subject && subject && entry.subject === subject) {
      return entry;
    }
    if (entry.email && normalizedEmail && entry.email.trim().toLowerCase() === normalizedEmail) {
      return entry;
    }
    if (entry.handle && normalizedHandle && entry.handle.trim().toLowerCase() === normalizedHandle) {
      return entry;
    }
  }

  return null;
};

export const resolveWorkforceIdentity = (
  me: SessionMe,
  raw: Record<string, unknown>
): ResolvedWorkforceIdentity => {
  const directoryEntry = findDirectoryEntry(me, raw);
  const rawSubject = (typeof raw.subject === "string" ? raw.subject : null) ?? (typeof raw.sub === "string" ? raw.sub : null);
  const rawHandle = typeof raw.handle === "string" ? raw.handle : null;
  const rawWorkforceRole = typeof raw.workforce_role === "string" ? raw.workforce_role : null;
  const rawTenantScopeMode = typeof raw.tenant_scope_mode === "string" ? raw.tenant_scope_mode : null;
  const rawCapabilityScope = Array.isArray(raw.capability_scope) ? raw.capability_scope : null;

  const derivedRole =
    normalizeWorkforceRole(directoryEntry?.workforce_role) ??
    normalizeWorkforceRole(rawWorkforceRole) ??
    (me.is_platform_admin ? "platform_admin" : null) ??
    (me.role?.trim().toLowerCase() === "admin" ? "internal_operator" : null) ??
    "customer";

  return {
    subject: directoryEntry?.subject ?? rawSubject ?? me.subject ?? me.user_id ?? me.email ?? null,
    handle: directoryEntry?.handle ?? rawHandle ?? me.handle ?? deriveHandleFromEmail(me.email),
    workforce_role: derivedRole,
    capability_scope: normalizeCapabilityScope(
      directoryEntry?.capability_scope ?? rawCapabilityScope ?? defaultCapabilityScopeForRole(derivedRole)
    ),
    tenant_scope_mode:
      normalizeTenantScopeMode(directoryEntry?.tenant_scope_mode) ??
      normalizeTenantScopeMode(rawTenantScopeMode) ??
      defaultTenantScopeModeForRole(derivedRole)
  };
};
