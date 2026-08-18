"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, AlertTriangle, XCircle, Ticket } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader } from "@/components/card";
import { LiveActivityTicker } from "@/components/live-activity-ticker";
import { useAuth } from "@/lib/use-auth";
import { useLiveStream } from "@/hooks/use-live-stream";
import {
  getDashboardStats,
  getDashboardAlerts,
  getExtendedDashboardStats,
  getLiveActivity,
  getLiveCounters,
  type LiveFeedItem,
} from "@/lib/api";
import { formatKsh, formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [extended, setExtended] = useState<Awaited<ReturnType<typeof getExtendedDashboardStats>> | null>(null);
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof getDashboardAlerts>> | null>(null);
  const [liveCounters, setLiveCounters] = useState<Awaited<ReturnType<typeof getLiveCounters>> | null>(null);
  const [initialFeed, setInitialFeed] = useState<LiveFeedItem[]>([]);
  const [error, setError] = useState("");
  const { events: streamEvents, connected } = useLiveStream(token);

  useEffect(() => {
    if (!token) return;
    getDashboardStats(token).then(setStats).catch((e) => setError(e.message));
    getExtendedDashboardStats(token).then(setExtended).catch(() => {});
    getDashboardAlerts(token).then(setAlerts).catch(() => {});
    getLiveActivity(token, { limit: 15 }).then((r) => setInitialFeed(r.items)).catch(() => {});
    getLiveCounters(token).then(setLiveCounters).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      getLiveCounters(token).then(setLiveCounters).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  if (!user) return null;

  const allAlerts = [
    ...(alerts?.overdue_submissions ?? []),
    ...(alerts?.licence_expiry ?? []),
    ...(alerts?.tax_arrears ?? []).slice(0, 3),
  ];

  const feedEvents = (() => {
    const merged = [...streamEvents, ...initialFeed];
    const seen = new Set<string>();
    return merged.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  })();

  return (
    <AppShell user={user} title="Dashboard">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader title="Active Operators" description={formatNumber(stats?.total_active_operators)} />
          <div className="flex items-center gap-2 text-sm text-muted">
            <Building2 className="h-4 w-4" />
            Registered raffle operators
          </div>
        </Card>
        <Card>
          <CardHeader title="Compliant" description={formatNumber(stats?.compliant_operators)} />
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            {extended?.compliance_rate ?? 0}% compliance rate
          </div>
        </Card>
        <Card>
          <CardHeader title="At Risk" description={formatNumber(stats?.at_risk_operators)} />
          <div className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4" />
            Requires monitoring
          </div>
        </Card>
        <Card>
          <CardHeader title="Non-Compliant" description={formatNumber(stats?.non_compliant_operators)} />
          <div className="flex items-center gap-2 text-sm text-danger">
            <XCircle className="h-4 w-4" />
            Enforcement may be required
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Total Annual GGR" description={formatKsh(stats?.total_annual_ggr)} />
        </Card>
        <Card>
          <CardHeader title="Tickets Today" description={formatNumber(liveCounters?.tickets_today)} />
          <div className="flex items-center gap-2 text-sm text-muted">
            <Ticket className="h-4 w-4" />
            Live — {liveCounters?.date ?? "today"} (EAT)
          </div>
        </Card>
        <Card>
          <CardHeader title="Revenue Today" description={formatKsh(liveCounters?.revenue_today)} />
          <p className="text-sm text-muted">Real-time ticket sales (EAT)</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Tax Paid" description={formatKsh(stats?.total_tax_paid)} />
        </Card>
        <Card>
          <CardHeader
            title="Active Licences"
            description={formatNumber(extended?.active_licences)}
          />
        </Card>
      </div>

      <Card className="mt-6">
        <LiveActivityTicker events={feedEvents} connected={connected} />
      </Card>

      {allAlerts.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-4 text-base font-semibold">Recent Alerts</h2>
          <ul className="space-y-2 text-sm">
            {allAlerts.map((alert, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <Link
                  href={`/operators/${alert.operator_external_id}`}
                  className="hover:text-primary"
                >
                  {alert.message}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  );
}
