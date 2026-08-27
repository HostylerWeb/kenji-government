import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const EAT_OFFSET = "+03:00";

function eatStartOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000${EAT_OFFSET}`);
}

function eatEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999${EAT_OFFSET}`);
}

function isValidDateStr(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async alerts() {
    const now = Date.now();
    const in90Days = now + 90 * 24 * 60 * 60 * 1000;

    const pendingOld = await this.prisma.client.submissions.findMany({
      where: {
        status: "pending",
        submitted_at: { lt: new Date(now - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        reporting_period: true,
      },
      take: 10,
    });

    const expiringLicences = await this.prisma.client.licences.findMany({
      where: {
        status: "active",
        expires_at: { lte: new Date(in90Days) },
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
      },
      orderBy: { expires_at: "asc" },
      take: 10,
    });

    const highArrears = await this.prisma.client.operators.findMany({
      where: { status: "active" },
      select: {
        external_id: true,
        trading_name: true,
        tax_paid: true,
        tax_due: true,
        compliance_status: true,
      },
    });

    const arrearsAlerts = highArrears
      .map((op) => ({
        external_id: op.external_id,
        trading_name: op.trading_name,
        compliance_status: op.compliance_status,
        tax_outstanding: Math.max(
          0,
          Number(op.tax_due ?? 0) - Number(op.tax_paid ?? 0),
        ),
      }))
      .filter((op) => op.tax_outstanding > 1000000)
      .sort((a, b) => b.tax_outstanding - a.tax_outstanding)
      .slice(0, 10);

    return {
      overdue_submissions: pendingOld.map((s) => ({
        type: "overdue_submission",
        message: `${s.operator.trading_name} — ${s.reporting_period.label} pending review`,
        operator_external_id: s.operator.external_id,
        submitted_at: s.submitted_at,
      })),
      licence_expiry: expiringLicences.map((l) => ({
        type: "licence_expiry",
        message: `${l.operator.trading_name} licence expires ${l.expires_at.toISOString().slice(0, 10)}`,
        operator_external_id: l.operator.external_id,
        expires_at: l.expires_at,
      })),
      tax_arrears: arrearsAlerts.map((a) => ({
        type: "tax_arrears",
        message: `${a.trading_name} — Ksh ${a.tax_outstanding.toLocaleString("en-KE")} outstanding`,
        operator_external_id: a.external_id,
        tax_outstanding: a.tax_outstanding.toString(),
      })),
    };
  }

  async extendedStats() {
    const [activeLicences, stats] = await Promise.all([
      this.prisma.client.licences.count({ where: { status: "active" } }),
      this.prisma.client.operators.aggregate({
        where: { status: "active" },
        _count: { _all: true },
        _sum: { annual_ggr: true, tax_paid: true, tax_due: true },
      }),
    ]);

    const compliant = await this.prisma.client.operators.count({
      where: { status: "active", compliance_status: "compliant" },
    });

    const total = stats._count._all;
    const compliance_rate =
      total > 0 ? Math.round((compliant / total) * 100) : 0;

    return {
      active_licences: activeLicences,
      compliance_rate,
      total_annual_ggr: stats._sum.annual_ggr?.toString() ?? "0",
      total_tax_paid: stats._sum.tax_paid?.toString() ?? "0",
      total_tax_due: stats._sum.tax_due?.toString() ?? "0",
    };
  }

  async charts() {
    const periods = await this.prisma.client.reporting_periods.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    });
    const orderedPeriods = [...periods].reverse();

    const periodIds = orderedPeriods.map((p) => p.id);
    const snapshots =
      periodIds.length > 0
        ? await this.prisma.client.operator_monthly_snapshots.findMany({
            where: { reporting_period_id: { in: periodIds } },
            select: {
              reporting_period_id: true,
              gross_gaming_revenue: true,
              tax_paid: true,
            },
          })
        : [];

    const ggrByPeriod = new Map<string, { ggr: number; tax: number }>();
    for (const snap of snapshots) {
      const current = ggrByPeriod.get(snap.reporting_period_id) ?? {
        ggr: 0,
        tax: 0,
      };
      current.ggr += Number(snap.gross_gaming_revenue ?? 0);
      current.tax += Number(snap.tax_paid ?? 0);
      ggrByPeriod.set(snap.reporting_period_id, current);
    }

    const ggr_trend = orderedPeriods.map((period) => {
      const totals = ggrByPeriod.get(period.id) ?? { ggr: 0, tax: 0 };
      return {
        month: period.label.split(" ")[0]?.slice(0, 3) ?? period.label,
        ggr: Math.round(totals.ggr),
        tax: Math.round(totals.tax),
      };
    });

    const [
      active,
      suspended,
      pending,
      revoked,
      compliant,
      atRisk,
      nonCompliant,
      expiringLicences,
    ] = await Promise.all([
      this.prisma.client.operators.count({ where: { status: "active" } }),
      this.prisma.client.operators.count({ where: { status: "suspended" } }),
      this.prisma.client.operators.count({ where: { status: "pending" } }),
      this.prisma.client.operators.count({ where: { status: "revoked" } }),
      this.prisma.client.operators.count({
        where: { status: "active", compliance_status: "compliant" },
      }),
      this.prisma.client.operators.count({
        where: { status: "active", compliance_status: "at_risk" },
      }),
      this.prisma.client.operators.count({
        where: { status: "active", compliance_status: "non_compliant" },
      }),
      this.prisma.client.licences.count({
        where: {
          status: "active",
          expires_at: {
            lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      ggr_trend,
      operator_status: [
        { name: "Active", value: active, color: "#16A34A" },
        { name: "Suspended", value: suspended, color: "#C12D31" },
        { name: "Pending", value: pending, color: "#D97706" },
        { name: "Revoked", value: revoked, color: "#94A3B8" },
      ].filter((item) => item.value > 0),
      compliance_breakdown: [
        { name: "Compliant", value: compliant, color: "#16A34A" },
        { name: "At Risk", value: atRisk, color: "#D97706" },
        { name: "Non-Compliant", value: nonCompliant, color: "#C12D31" },
      ].filter((item) => item.value > 0),
      metrics: {
        compliance_rate:
          active > 0 ? Math.round((compliant / active) * 100) : 0,
        tax_collection_rate: (() => {
          const paid = snapshots.reduce(
            (sum, snap) => sum + Number(snap.tax_paid ?? 0),
            0,
          );
          const ggr = snapshots.reduce(
            (sum, snap) => sum + Number(snap.gross_gaming_revenue ?? 0),
            0,
          );
          const expectedTax = ggr * 0.15;
          return expectedTax > 0
            ? Math.min(100, Math.round((paid / expectedTax) * 100))
            : 0;
        })(),
        active_share:
          active + suspended + pending + revoked > 0
            ? Math.round(
                (active / (active + suspended + pending + revoked)) * 100,
              )
            : 0,
        expiring_licences: expiringLicences,
      },
    };
  }

  async navBadges() {
    const [
      pendingSubmissions,
      pendingApplications,
      nonCompliant,
      atRisk,
      openCases,
      openAmlAlerts,
      pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.client.submissions.count({
        where: { status: { in: ["pending", "revision_requested"] } },
      }),
      this.prisma.client.operator_applications.count({
        where: { status: { in: ["submitted", "under_review"] } },
      }),
      this.prisma.client.operators.count({
        where: { status: "active", compliance_status: "non_compliant" },
      }),
      this.prisma.client.operators.count({
        where: { status: "active", compliance_status: "at_risk" },
      }),
      this.prisma.client.enforcement_cases.findMany({
        where: { status: { in: ["open", "escalated"] } },
        select: { metadata: true },
      }),
      this.prisma.client.aml_alerts.count({ where: { status: "open" } }),
      this.prisma.client.tax_withdrawal_batches.count({
        where: { status: "pending" },
      }),
    ]);

    const enforcement = openCases.filter((caseRecord) => {
      const metadata = caseRecord.metadata as Record<string, unknown> | null;
      return metadata?.quick_warning !== true;
    }).length;

    return {
      applications: pendingApplications,
      submissions: pendingSubmissions,
      compliance: nonCompliant + atRisk,
      enforcement,
      payments: openAmlAlerts + pendingWithdrawals,
    };
  }

  async performanceMetrics(fromStr: string, toStr: string) {
    if (!isValidDateStr(fromStr) || !isValidDateStr(toStr)) {
      throw new BadRequestException("from and to must be YYYY-MM-DD");
    }
    if (fromStr > toStr) {
      throw new BadRequestException("from must be on or before to");
    }

    const from = eatStartOfDay(fromStr);
    const to = eatEndOfDay(toStr);

    const [
      completedPayments,
      failedPayments,
      licencesExpiring,
      compliant,
      active,
    ] = await Promise.all([
      this.prisma.client.payment_transactions.aggregate({
        where: {
          status: "completed",
          completed_at: { gte: from, lte: to },
        },
        _count: { _all: true },
        _sum: { gross_amount: true, tax_amount: true },
      }),
      this.prisma.client.payment_transactions.count({
        where: {
          status: "failed",
          created_at: { gte: from, lte: to },
        },
      }),
      this.prisma.client.licences.count({
        where: {
          status: "active",
          expires_at: { gte: from, lte: to },
        },
      }),
      this.prisma.client.operators.count({
        where: { status: "active", compliance_status: "compliant" },
      }),
      this.prisma.client.operators.count({ where: { status: "active" } }),
    ]);

    const revenue = Number(completedPayments._sum.gross_amount ?? 0);
    const tax = Number(completedPayments._sum.tax_amount ?? 0);
    const completedCount = completedPayments._count._all;
    const attempted = completedCount + failedPayments;
    const expectedTax = revenue * 0.15;

    return {
      from: fromStr,
      to: toStr,
      metrics: {
        compliance_rate:
          active > 0 ? Math.round((compliant / active) * 100) : 0,
        tax_collection_rate:
          expectedTax > 0
            ? Math.min(100, Math.round((tax / expectedTax) * 100))
            : 0,
        payment_success_rate:
          attempted > 0
            ? Math.round((completedCount / attempted) * 100)
            : 0,
        expiring_licences: licencesExpiring,
        revenue: revenue.toFixed(2),
        tax_collected: tax.toFixed(2),
        payments_completed: completedCount,
      },
    };
  }
}
