"use client";

import { useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { portalApi } from "@/lib/client/api";
import { useApiResource } from "@/lib/client/use-api-resource";
import { isInternalAdmin } from "@/lib/client/authz";

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
    ...(isInternalAdmin(meState.data) ? [{ href: "/audit-log", label: "Audit Log" }] : []),
    ...(isInternalAdmin(meState.data) ? [{ href: "/internal-admin", label: "Internal Admin" }] : [])
  ];

  const logout = async (): Promise<void> => {
    await portalApi.logout();
    router.push("/login");
  };

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
          <button className="btn btn-secondary" onClick={() => void logout()} type="button">
            Log Out
          </button>
        </nav>
      </div>
    </header>
  );
};
