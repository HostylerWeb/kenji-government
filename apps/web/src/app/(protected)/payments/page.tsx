"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { PaymentsNav } from "@/components/payments-nav";
import { useAuth } from "@/lib/use-auth";
import { getPaymentsOverview, type PaymentsOverview } from "@/lib/api";
import { formatKsh } from "@/lib/utils";

export default function PaymentsOverviewPage() {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState<PaymentsOverview | null>(null);

  useEffect(() => {
    if (!token) return;
    getPaymentsOverview(token).then(setOverview).catch(() => {});
  }, [token]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Payments & AML">
      <PaymentsNav />
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-muted">Gateway payments today</p>
            <p className="text-2xl font-semibold">{overview.payments_today}</p>
            <p className="text-xs text-muted">
              Success rate: {overview.success_rate}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Gross today</p>
            <p className="text-2xl font-semibold">{formatKsh(overview.gross_today)}</p>
            <p className="text-xs text-muted">{overview.failed_today} failed</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Tax earmarked today</p>
            <p className="text-2xl font-semibold text-gra-green">
              {formatKsh(overview.tax_earmarked_today)}
            </p>
            <p className="text-xs text-muted">
              Withdrawn today: {formatKsh(overview.tax_withdrawn_today)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Earmarked balance</p>
            <p className="text-2xl font-semibold">
              {formatKsh(overview.earmarked_balance)}
            </p>
            <p className="text-xs text-muted">
              {overview.earmarked_entry_count} entries · rate{" "}
              {(overview.tax_rate * 100).toFixed(1)}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Open AML alerts</p>
            <p className="text-2xl font-semibold">{overview.open_aml_alerts}</p>
            <Link href="/payments/aml" className="text-xs text-primary hover:underline">
              Review queue →
            </Link>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
