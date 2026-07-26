"use client";

import { useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";
import { canViewAuditLog, canViewInternalAdmin, isInternalAdmin } from "@/lib/client/authz";
import { hasCapability } from "@/lib/shared/workforce-auth";

const humanizeRole = (value: string | null | undefined): string => {
  switch (value) {
    case "platform_admin":
      return "Platform Admin";
    case "internal_operator":
      return "Internal Operator";
    case "internal_sales_rep":
      return "Sales Representative";
    case "customer":
      return "Customer";
    default:
      return "Signed In";
  }
};

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/business-profile", label: "Business Profile" },
  { href: "/agent-mode", label: "Call Settings" },
  { href: "/billing", label: "Billing" },
  { href: "/change-password", label: "Change Password" }
];

export const PortalNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const meState = useApiResource(useCallback(() => portalApi.me(), []));

  const links = [
    ...baseLinks,
    ...(hasCapability(meState.data, "tenant.onboarding.read_own") || hasCapability(meState.data, "tenant.onboarding.read_all")
      ? [{ href: "/onboarding", label: "My Onboarding" }]
      : []),
    ...(canViewAuditLog(meState.data) ? [{ href: "/audit-log", label: isInternalAdmin(meState.data) ? "Audit Log" : "My Activity" }] : []),
    ...(canViewInternalAdmin(meState.data)
      ? [{ href: "/internal-admin", label: isInternalAdmin(meState.data) ? "Internal Admin" : "Tenant Onboarding" }]
      : []),
    ...(isInternalAdmin(meState.data) ? [{ href: "/internal-admin/workforce", label: "Workforce" }] : [])
  ];

  const logout = async (): Promise<void> => {
    await portalApi.logout();
    router.push("/login");
  };

  const roleLabel = humanizeRole(meState.data?.workforce_role ?? null);
  const identityLabel = meState.data?.email || meState.data?.handle || "Active session";
  const scopeLabel =
    meState.data?.tenant_scope_mode === "create_and_assigned_only"
      ? "Scoped to assigned tenants"
      : meState.data?.tenant_scope_mode === "all"
      ? "Global workforce scope"
      : null;

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/dashboard" className="brand-link" aria-label="Syndicate Voice Portal Home">
          <Image
            src="/branding/syndicate-logo-transparent-192.png"
            alt="Syndicate AI"
            width={34}
            height={34}
            className="brand-logo"
            priority
          />
          <span className="brand-text">Syndicate Voice Portal</span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link" data-active={String(pathname === link.href)}>
              {link.label}
            </Link>
          ))}
          <div className="stack" style={{ gap: "0.15rem", alignItems: "flex-end" }}>
            <div className="label" style={{ margin: 0 }}>
              {roleLabel}
            </div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {identityLabel}
            </div>
            {scopeLabel ? (
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                {scopeLabel}
              </div>
            ) : null}
          </div>
          <button className="btn btn-secondary" onClick={() => void logout()} type="button">
            Log Out
          </button>
        </nav>
      </div>
    </header>
  );
};
