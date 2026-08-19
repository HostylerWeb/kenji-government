"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ticket,
  CreditCard,
  TrendingUp,
  Banknote,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonCard } from "@/components/skeleton";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { events: streamEvents, connected } = useLiveStream(token);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      getDashboardStats(token).then(setStats),
      getExtendedDashboardStats(token).then(setExtended).catch(() => {}),
      getDashboardAlerts(token).then(setAlerts).catch(() => {}),
      getLiveActivity(token, { limit: 15 }).then((r) => setInitialFeed(r.items)).catch(() => {}),
      getLiveCounters(token).then(setLiveCounters).catch(() => {}),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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

  const complianceRate = extended?.compliance_rate ?? 0;

  return (
    <AppShell user={user} title="Dashboard">
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Real-time overview of the GRA raffle oversight platform"
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* ── KPI stat cards ────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                title="Active Operators"
                value={formatNumber(stats?.total_active_operators)}
                subLabel="Registered raffle operators"
                icon={<Building2 className="h-5 w-5" />}
                variant="primary"
              />
              <StatCard
                title="Compliance Rate"
                value={`${complianceRate}%`}
                subLabel={`${formatNumber(stats?.compliant_operators)} compliant`}
                icon={<ShieldCheck className="h-5 w-5" />}
                variant={complianceRate >= 80 ? "success" : complianceRate >= 60 ? "warning" : "danger"}
              />
              <StatCard
                title="Revenue Today"
                value={formatKsh(liveCounters?.revenue_today)}
                subLabel="Ticket sales (EAT)"
                icon={<TrendingUp className="h-5 w-5" />}
                variant="success"
              />
              <StatCard
                title="Open Alerts"
                value={formatNumber(allAlerts.length)}
                subLabel="Requires attention"
                icon={<AlertTriangle className="h-5 w-5" />}
                variant={allAlerts.length > 0 ? "warning" : "default"}
              />
            </>
          )}
        </div>

        {/* ── Secondary KPIs ────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                title="At Risk"
                value={formatNumber(stats?.at_risk_operators)}
                subLabel="Monitoring required"
                icon={<AlertTriangle className="h-5 w-5" />}
                variant="warning"
                className="xl:col-span-1"
              />
              <StatCard
                title="Non-Compliant"
                value={formatNumber(stats?.non_compliant_operators)}
                subLabel="Enforcement possible"
                icon={<XCircle className="h-5 w-5" />}
                variant="danger"
                className="xl:col-span-1"
              />
              <StatCard
                title="Annual GGR"
                value={formatKsh(stats?.total_annual_ggr)}
                subLabel="Gross gaming revenue"
                icon={<Banknote className="h-5 w-5" />}
                className="xl:col-span-1"
              />
              <StatCard
                title="Tickets Today"
                value={formatNumber(liveCounters?.tickets_today)}
                subLabel={`Live — ${liveCounters?.date ?? "today"}`}
                icon={<Ticket className="h-5 w-5" />}
                className="xl:col-span-1"
              />
              <StatCard
                title="Active Licences"
                value={formatNumber(extended?.active_licences)}
                subLabel="Valid raffle licences"
                icon={<CheckCircle2 className="h-5 w-5" />}
                variant="success"
                className="xl:col-span-1"
              />
            </>
          )}
        </div>

        {/* ── Live feed + Alerts ─────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Live activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Live Activity
                  </CardTitle>
                  <Badge
                    variant={connected ? "success" : "muted"}
                    dot
                    size="sm"
                  >
                    {connected ? "Connected" : "Reconnecting…"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <LiveActivityTicker events={feedEvents} connected={connected} />
              </CardContent>
            </Card>
          </div>

          {/* Alerts panel */}
          <div>
            <Card className="h-full">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Recent Alerts
                  {allAlerts.length > 0 && (
                    <Badge variant="warning" size="sm">{allAlerts.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {allAlerts.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle2 className="h-6 w-6" />}
                    title="No active alerts"
                    description="All operators are within compliance thresholds."
                    className="py-10"
                  />
                ) : (
                  <ul className="divide-y divide-border/50">
                    {allAlerts.map((alert, i) => (
                      <li key={i} className="px-5 py-3">
                        <Link
                          href={`/operators/${alert.operator_external_id}`}
                          className="flex items-start gap-2.5 group"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                            {alert.message}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Payments row ──────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Gateway Payments Today"
            value={formatNumber(liveCounters?.gateway_payments_today)}
            subLabel="Harambe Pay (EAT)"
            icon={<CreditCard className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard
            title="Tax Earmarked Today"
            value={formatKsh(liveCounters?.tax_earmarked_today)}
            subLabel="Government share (EAT)"
            icon={<Banknote className="h-5 w-5" />}
            loading={loading}
          />
        </div>
      </div>
    </AppShell>
  );
}
