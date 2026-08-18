import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

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
}
