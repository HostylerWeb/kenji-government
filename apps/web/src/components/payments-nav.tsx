"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GatewayIntegrationBanner } from "@/components/gateway-integration-banner";
import { getStoredAuth } from "@/lib/auth";
import { getPaymentsOverview } from "@/lib/api";

type PaymentNavCounts = {
  aml: number;
  withdrawals: number;
};

const EMPTY_COUNTS: PaymentNavCounts = { aml: 0, withdrawals: 0 };

const links = [
  { href: "/payments", label: "Overview", exact: true },
  { href: "/payments/transactions", label: "Transactions" },
  {
    href: "/payments/tax-escrow",
    label: "Tax Escrow",
    countKey: "withdrawals" as const,
  },
  { href: "/payments/aml", label: "AML Queue", countKey: "aml" as const },
  { href: "/payments/operators", label: "Operators" },
];

function NavTabBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <span
      className="ml-1.5 rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white"
      aria-label={`${count} items need attention`}
    >
      {label}
    </span>
  );
}

export function PaymentsNav() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<PaymentNavCounts>(EMPTY_COUNTS);

  const refreshCounts = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.access_token) {
      setCounts(EMPTY_COUNTS);
      return;
    }
    try {
      const overview = await getPaymentsOverview(auth.access_token);
      setCounts({
        aml: overview.open_aml_alerts,
        withdrawals: overview.pending_withdrawal_batches,
      });
    } catch {
      // Keep last known counts if refresh fails.
    }
  }, []);

  useEffect(() => {
    refreshCounts();
    const interval = window.setInterval(refreshCounts, 60_000);
    return () => window.clearInterval(interval);
  }, [refreshCounts, pathname]);

  return (
    <>
      <GatewayIntegrationBanner />
      <nav className="mb-5 flex min-w-0 gap-0 overflow-x-auto border-b border-border [-webkit-overflow-scrolling:touch]" aria-label="Payments navigation">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const count = link.countKey ? counts[link.countKey] : 0;

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
              <NavTabBadge count={count} />
            </Link>
          );
        })}
      </nav>
    </>
  );
}
