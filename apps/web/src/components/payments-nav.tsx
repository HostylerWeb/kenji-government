"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GatewayIntegrationBanner } from "@/components/gateway-integration-banner";

const links = [
  { href: "/payments", label: "Overview", exact: true },
  { href: "/payments/transactions", label: "Transactions" },
  { href: "/payments/tax-escrow", label: "Tax Escrow" },
  { href: "/payments/aml", label: "AML Queue" },
  { href: "/payments/operators", label: "Operators" },
];

export function PaymentsNav() {
  const pathname = usePathname();

  return (
    <>
      <GatewayIntegrationBanner />
      <nav className="mb-6 flex flex-wrap gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch] pb-1">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary text-white"
                : "bg-secondary text-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
    </>
  );
}
