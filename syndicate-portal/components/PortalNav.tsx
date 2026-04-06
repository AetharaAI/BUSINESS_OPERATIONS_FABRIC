"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { portalApi } from "@/lib/client/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/business-profile", label: "Business Profile" },
  { href: "/agent-mode", label: "Agent Mode" },
  { href: "/audit-log", label: "Audit Log" }
];

export const PortalNav = () => {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async (): Promise<void> => {
    await portalApi.logout();
    router.push("/login");
  };

  return (
    <header className="header">
      <div className="container header-inner">
        <div className="brand">Syndicate Voice Portal</div>
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
