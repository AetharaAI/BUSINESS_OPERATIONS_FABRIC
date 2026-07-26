import { describe, expect, it } from "vitest";
import { isInternalAdmin } from "@/lib/shared/internal-admin";

describe("isInternalAdmin", () => {
  it("allows platform admins", () => {
    expect(isInternalAdmin({ is_platform_admin: true, role: "owner", workforce_role: "platform_admin" })).toBe(true);
  });

  it("allows internal operator sessions without platform admin flag", () => {
    expect(isInternalAdmin({ is_platform_admin: false, role: "admin" })).toBe(true);
    expect(isInternalAdmin({ workforce_role: "internal_operator", role: "owner" })).toBe(true);
  });

  it("denies scoped sales reps and non-admin tenant roles", () => {
    expect(isInternalAdmin({ workforce_role: "internal_sales_rep", role: "owner" })).toBe(false);
    expect(isInternalAdmin({ is_platform_admin: false, role: "owner" })).toBe(false);
    expect(isInternalAdmin({ is_platform_admin: false, role: "agent" })).toBe(false);
    expect(isInternalAdmin({ role: null })).toBe(false);
    expect(isInternalAdmin(null)).toBe(false);
  });
});
