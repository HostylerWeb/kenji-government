"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, TrendingUp, Banknote, AlertTriangle, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { SkeletonCard } from "@/components/skeleton";
import { PaymentsNav } from "@/components/payments-nav";
import { useAuth } from "@/lib/use-auth";
import { getPaymentsOverview, type PaymentsOverview } from "@/lib/api";
import { formatKsh } from "@/lib/utils";

export default function PaymentsOverviewPage() {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState<PaymentsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getPaymentsOverview(token)
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Payments & AML">
      <PaymentsNav />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
            <SkeletonCard /><SkeletonCard />
          </>
        ) : overview ? (
          <>
            <StatCard
              title="Gateway Payments Today"
              value={overview.payments_today}
              subLabel={`Success rate: ${overview.success_rate}%`}
              icon={<CreditCard className="h-5 w-5" />}
              variant="primary"
            />
            <StatCard
              title="Gross Today"
              value={formatKsh(overview.gross_today)}
              subLabel={`${overview.failed_today} failed`}
              icon={<TrendingUp className="h-5 w-5" />}
              variant="success"
            />
            <StatCard
              title="Tax Earmarked Today"
              value={formatKsh(overview.tax_earmarked_today)}
              subLabel={`Withdrawn: ${formatKsh(overview.tax_withdrawn_today)}`}
              icon={<Banknote className="h-5 w-5" />}
              variant="success"
            />
            <StatCard
              title="Earmarked Balance"
              value={formatKsh(overview.earmarked_balance)}
              subLabel={`${overview.earmarked_entry_count} entries · rate ${(overview.tax_rate * 100).toFixed(1)}%`}
              icon={<Banknote className="h-5 w-5" />}
            />
            <StatCard
              title="Open AML Alerts"
              value={overview.open_aml_alerts}
              subLabel={
                <Link href="/payments/aml" className="flex items-center gap-1 text-primary hover:underline text-xs">
                  Review queue <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
              icon={<AlertTriangle className="h-5 w-5" />}
              variant={overview.open_aml_alerts > 0 ? "warning" : "default"}
            />
            <StatCard
              title="Pending Withdrawals"
              value={overview.pending_withdrawal_batches}
              subLabel={
                <Link href="/payments/tax-escrow" className="flex items-center gap-1 text-primary hover:underline text-xs">
                  Tax escrow batches <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
              icon={<Banknote className="h-5 w-5" />}
              variant={overview.pending_withdrawal_batches > 0 ? "warning" : "default"}
            />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
