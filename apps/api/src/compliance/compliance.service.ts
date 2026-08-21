import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function filingDueDate(periodEndsAt: Date): Date {
  const end = new Date(periodEndsAt);
  return new Date(end.getFullYear(), end.getMonth() + 1, 15);
}

function deadlineStatus(dueDate: Date, today: Date): "upcoming" | "due_today" | "overdue" {
  const dueKey = toDateKey(dueDate);
  const todayKey = toDateKey(today);
  if (dueKey < todayKey) return "overdue";
  if (dueKey === todayKey) return "due_today";
  return "upcoming";
}

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

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
        submissions: {
          select: {
            status: true,
            reporting_period_id: true,
          },
        },
      },
      orderBy: { trading_name: "asc" },
    });

    const reportingPeriods = await this.prisma.client.reporting_periods.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
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
      return daysBetween(s.submitted_at, today) > 30;
    });

    let totalArrears = 0;
    const tiers = { compliant: 0, at_risk: 0, non_compliant: 0 };
    const expiringLicences: Array<{
      operator_external_id: string;
      operator_name: string;
      licence_number: string;
      expires_at: string;
      days_remaining: number;
    }> = [];

    const operatorRows = operators.map((op) => {
      const taxDue = Number(op.tax_due ?? 0);
      const taxPaid = Number(op.tax_paid ?? 0);
      const outstanding = Math.max(0, taxDue - taxPaid);
      totalArrears += outstanding;
      tiers[op.compliance_status] += 1;

      const licence = op.licences[0];
      const licenceExpiring =
        licence &&
        licence.expires_at.getTime() - today.getTime() < 90 * MS_PER_DAY;

      if (licence) {
        const daysRemaining = daysBetween(today, licence.expires_at);
        if (daysRemaining > 0 && daysRemaining <= 90) {
          expiringLicences.push({
            operator_external_id: op.external_id,
            operator_name: op.trading_name,
            licence_number: licence.licence_number,
            expires_at: licence.expires_at.toISOString(),
            days_remaining: daysRemaining,
          });
        }
      }

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

    expiringLicences.sort((a, b) => a.days_remaining - b.days_remaining);

    const submittedPeriodIdsByOperator = new Map<string, Set<string>>();
    for (const op of operators) {
      submittedPeriodIdsByOperator.set(
        op.id,
        new Set(
          op.submissions
            .filter((s) => s.status === "approved" || s.status === "pending")
            .map((s) => s.reporting_period_id),
        ),
      );
    }

    const upcomingDeadlines: Array<{
      id: string;
      type: "monthly_return" | "licence_renewal" | "submission_review";
      title: string;
      due_date: string;
      status: "upcoming" | "due_today" | "overdue";
      operator_external_id?: string;
      operator_name?: string;
    }> = [];

    for (const period of reportingPeriods) {
      const due = filingDueDate(period.ends_at);
      const dueKey = toDateKey(due);
      if (due > in30Days && deadlineStatus(due, today) !== "overdue") continue;

      const missingOperators = operators.filter((op) => {
        const submitted = submittedPeriodIdsByOperator.get(op.id);
        return !submitted?.has(period.id);
      });

      if (missingOperators.length === 0) continue;

      for (const op of missingOperators) {
        const status = deadlineStatus(due, today);
        if (status === "overdue" || due <= in30Days) {
          upcomingDeadlines.push({
            id: `filing-${period.id}-${op.external_id}`,
            type: "monthly_return",
            title: `Monthly return — ${period.label}`,
            due_date: dueKey,
            status,
            operator_external_id: op.external_id,
            operator_name: op.trading_name,
          });
        }
      }
    }

    for (const licence of expiringLicences) {
      const expiresAt = new Date(licence.expires_at);
      expiresAt.setHours(0, 0, 0, 0);
      upcomingDeadlines.push({
        id: `licence-${licence.operator_external_id}`,
        type: "licence_renewal",
        title: "Licence renewal",
        due_date: toDateKey(expiresAt),
        status: deadlineStatus(expiresAt, today),
        operator_external_id: licence.operator_external_id,
        operator_name: licence.operator_name,
      });
    }

    for (const submission of pendingSubmissions) {
      const reviewDue = submission.submitted_at
        ? new Date(submission.submitted_at)
        : today;
      reviewDue.setDate(reviewDue.getDate() + 14);
      if (reviewDue <= in30Days || reviewDue < today) {
        upcomingDeadlines.push({
          id: `review-${submission.id}`,
          type: "submission_review",
          title: `Review ${submission.reporting_period.label} return`,
          due_date: toDateKey(reviewDue),
          status: deadlineStatus(reviewDue, today),
          operator_external_id: submission.operator.external_id,
          operator_name: submission.operator.trading_name,
        });
      }
    }

    upcomingDeadlines.sort((a, b) => a.due_date.localeCompare(b.due_date));

    const overdueFilings = operators
      .map((op) => {
        const submitted = submittedPeriodIdsByOperator.get(op.id);
        const missingOverdue = reportingPeriods.filter((period) => {
          const due = filingDueDate(period.ends_at);
          due.setHours(0, 0, 0, 0);
          if (due >= today) return false;
          return !submitted?.has(period.id);
        });
        return { op, missingOverdue };
      })
      .filter(({ op, missingOverdue }) => {
        if (missingOverdue.length > 0) return true;
        return op.compliance_status === "non_compliant";
      })
      .map(({ op, missingOverdue }) => {
        const oldestMissing = missingOverdue.at(-1);
        const dueDate = oldestMissing ? filingDueDate(oldestMissing.ends_at) : null;
        const daysOverdue =
          dueDate && dueDate < today ? daysBetween(dueDate, today) : null;

        let reason: string;
        if (missingOverdue.length > 0) {
          const labels = missingOverdue.map((p) => p.label);
          reason =
            labels.length === 1
              ? `Missing ${labels[0]} return`
              : `Missing ${labels.length} returns (${labels.slice(0, 2).join(", ")}${labels.length > 2 ? "…" : ""})`;
        } else {
          reason = "Non-compliant status";
        }

        return {
          operator_external_id: op.external_id,
          operator_name: op.trading_name,
          last_submission_at: op.last_submission_at?.toISOString() ?? null,
          compliance_status: op.compliance_status,
          reason,
          days_overdue: daysOverdue,
        };
      })
      .sort((a, b) => (b.days_overdue ?? 0) - (a.days_overdue ?? 0));

    const upcomingInWindow = upcomingDeadlines.filter((d) => {
      const due = new Date(d.due_date);
      return due >= today && due <= in30Days;
    });

    return {
      tiers,
      total_arrears: totalArrears.toString(),
      overdue_submission_count: overdue.length,
      pending_submission_count: pendingSubmissions.length,
      calendar_summary: {
        upcoming_deadlines: upcomingInWindow.length,
        overdue_filings: overdueFilings.length,
        pending_review: pendingSubmissions.length,
        expiring_licences: expiringLicences.length,
      },
      upcoming_deadlines: upcomingDeadlines.slice(0, 50),
      expiring_licences: expiringLicences,
      overdue_filings: overdueFilings,
      pending_reviews: pendingSubmissions.map((s) => ({
        id: s.id,
        operator_external_id: s.operator.external_id,
        operator_name: s.operator.trading_name,
        period: s.reporting_period.label,
        submitted_at: s.submitted_at,
        tax_outstanding: s.tax_outstanding.toString(),
        is_overdue: !s.submitted_at || daysBetween(s.submitted_at, today) > 30,
      })),
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
