import { describe, expect, it } from "vitest";
import { isInternalAdmin } from "@/lib/shared/internal-admin";

describe("isInternalAdmin", () => {
  it("allows platform admins", () => {
    expect(isInternalAdmin({ is_platform_admin: true, role: "owner" })).toBe(true);
  });

  it("allows admin role sessions without platform admin flag", () => {
    expect(isInternalAdmin({ is_platform_admin: false, role: "admin" })).toBe(true);
    expect(isInternalAdmin({ role: " Admin " })).toBe(true);
  });

  it("denies non-admin tenant roles", () => {
    expect(isInternalAdmin({ is_platform_admin: false, role: "owner" })).toBe(false);
    expect(isInternalAdmin({ is_platform_admin: false, role: "agent" })).toBe(false);
    expect(isInternalAdmin({ role: null })).toBe(false);
    expect(isInternalAdmin(null)).toBe(false);
  });
});
