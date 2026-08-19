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
      <nav className="mb-5 flex min-w-0 gap-0 overflow-x-auto border-b border-border [-webkit-overflow-scrolling:touch]" aria-label="Payments navigation">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:transition-all",
                active
                  ? "text-primary after:bg-primary"
                  : "text-muted-foreground hover:text-foreground after:bg-transparent hover:after:bg-border"
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
