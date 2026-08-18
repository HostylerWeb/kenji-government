import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const operators = await this.prisma.client.operators.findMany({
      where: { status: "active" },
      select: {
        id: true,
        external_id: true,
        trading_name: true,
        compliance_status: true,
        region: true,
        tax_paid: true,
        tax_due: true,
        last_submission_at: true,
        licences: {
          where: { status: "active" },
          select: { licence_number: true, expires_at: true },
          take: 1,
        },
      },
      orderBy: { trading_name: "asc" },
    });

    const pendingSubmissions = await this.prisma.client.submissions.findMany({
      where: { status: "pending" },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        reporting_period: true,
      },
      orderBy: { submitted_at: "asc" },
    });

    const overdue = pendingSubmissions.filter((s) => {
      if (!s.submitted_at) return true;
      const days =
        (Date.now() - s.submitted_at.getTime()) / (1000 * 60 * 60 * 24);
      return days > 30;
    });

    let totalArrears = 0;
    const tiers = { compliant: 0, at_risk: 0, non_compliant: 0 };
    const operatorRows = operators.map((op) => {
      const taxDue = Number(op.tax_due ?? 0);
      const taxPaid = Number(op.tax_paid ?? 0);
      const outstanding = Math.max(0, taxDue - taxPaid);
      totalArrears += outstanding;
      tiers[op.compliance_status] += 1;

      const licence = op.licences[0];
      const licenceExpiring =
        licence &&
        licence.expires_at.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;

      return {
        external_id: op.external_id,
        trading_name: op.trading_name,
        compliance_status: op.compliance_status,
        region: op.region,
        tax_outstanding: outstanding.toString(),
        last_submission_at: op.last_submission_at,
        licence_expiring: licenceExpiring ?? false,
        licence_expires_at: licence?.expires_at ?? null,
      };
    });

    return {
      tiers,
      total_arrears: totalArrears.toString(),
      overdue_submission_count: overdue.length,
      pending_submission_count: pendingSubmissions.length,
      overdue_submissions: overdue.map((s) => ({
        id: s.id,
        operator_external_id: s.operator.external_id,
        operator_name: s.operator.trading_name,
        period: s.reporting_period.label,
        submitted_at: s.submitted_at,
        tax_outstanding: s.tax_outstanding.toString(),
      })),
      operators: operatorRows,
    };
  }
}
