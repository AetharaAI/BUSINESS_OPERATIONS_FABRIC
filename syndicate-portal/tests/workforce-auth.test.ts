import { describe, expect, it } from "vitest";
import {
  canAccessTenantState,
  canManageOnboardingOperations,
  canTrackExistingTenants,
  defaultCapabilityScopeForRole,
  hasCapability,
  normalizeCapabilityScope
} from "@/lib/shared/workforce-auth";

describe("workforce auth", () => {
  it("grants the expected scoped capabilities to internal sales reps", () => {
    const scope = defaultCapabilityScopeForRole("internal_sales_rep");
    expect(scope).toContain("tenant.create");
    expect(scope).toContain("tenant.onboarding.read_own");
    expect(scope).not.toContain("tenant.onboarding.read_all");
    expect(scope).not.toContain("audit.read_all");
  });

  it("normalizes capability scope without unknown values", () => {
    expect(normalizeCapabilityScope(["tenant.create", "tenant.create", "nope"])).toEqual(["tenant.create"]);
  });

  it("matches assigned or created tenants for scoped sales reps", () => {
    const me = {
      user_id: "user_123",
      subject: "subject_123",
      email: "sundaepromix@gmail.com",
      handle: "sundaepromix",
      capability_scope: defaultCapabilityScopeForRole("internal_sales_rep"),
      tenant_scope_mode: "create_and_assigned_only"
    };

    expect(
      canAccessTenantState(me, {
        created_by_user_id: null,
        created_by_subject: null,
        sales_rep_id: "user_123",
        sales_rep_email: null,
        sales_rep_handle: null,
        assigned_user_ids: []
      })
    ).toBe(true);

    expect(
      canAccessTenantState(me, {
        created_by_user_id: null,
        created_by_subject: null,
        sales_rep_id: null,
        sales_rep_email: "other@example.com",
        sales_rep_handle: null,
        assigned_user_ids: []
      })
    ).toBe(false);
  });

  it("treats operator scopes as globally readable", () => {
    const me = {
      capability_scope: defaultCapabilityScopeForRole("internal_operator")
    };

    expect(hasCapability(me, "tenant.onboarding.read_all")).toBe(true);
  });

  it("limits existing-tenant tracking and operational status controls to operator scopes", () => {
    const salesRep = {
      capability_scope: defaultCapabilityScopeForRole("internal_sales_rep")
    };
    const operator = {
      capability_scope: defaultCapabilityScopeForRole("internal_operator")
    };

    expect(canManageOnboardingOperations(salesRep)).toBe(false);
    expect(canTrackExistingTenants(salesRep)).toBe(false);
    expect(canManageOnboardingOperations(operator)).toBe(true);
    expect(canTrackExistingTenants(operator)).toBe(true);
  });
});
