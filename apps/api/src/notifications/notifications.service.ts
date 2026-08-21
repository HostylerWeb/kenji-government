import { Injectable } from "@nestjs/common";
import type {
  AppNotification,
  NotificationSeverity,
  NotificationsResponse,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";

const AML_TYPE_LABELS: Record<string, string> = {
  velocity: "High payment velocity",
  structuring: "Structuring pattern detected",
  kyc_mismatch: "KYC mismatch",
  other: "Suspicious activity",
};

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  danger: 3,
  warning: 2,
  info: 1,
};

function licenceExpiryMessage(
  tradingName: string,
  expiresAt: Date,
  now: number,
): string {
  const msUntil = expiresAt.getTime() - now;
  const daysUntil = Math.ceil(msUntil / (24 * 60 * 60 * 1000));

  if (daysUntil <= 0) {
    return `${tradingName} licence expires today`;
  }
  if (daysUntil === 1) {
    return `${tradingName} licence expires tomorrow`;
  }
  if (daysUntil <= 7) {
    return `${tradingName} licence expires in ${daysUntil} days`;
  }

  return `${tradingName} licence expires ${expiresAt.toISOString().slice(0, 10)}`;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<NotificationsResponse> {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(now + 90 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now + 7 * 24 * 60 * 60 * 1000);

    const [
      recentPendingSubmissions,
      overduePendingSubmissions,
      expiringLicences,
      highArrears,
      openAmlAlerts,
      openEnforcementCases,
      recentDocuments,
    ] = await Promise.all([
      this.prisma.client.submissions.findMany({
        where: {
          status: "pending",
          OR: [
            { submitted_at: { gte: thirtyDaysAgo } },
            { submitted_at: null, created_at: { gte: thirtyDaysAgo } },
          ],
        },
        include: {
          operator: { select: { external_id: true, trading_name: true } },
          reporting_period: true,
        },
        orderBy: [{ submitted_at: "desc" }, { created_at: "desc" }],
        take: 8,
      }),
      this.prisma.client.submissions.findMany({
        where: {
          status: "pending",
          OR: [
            { submitted_at: { lt: thirtyDaysAgo } },
            { submitted_at: null, created_at: { lt: thirtyDaysAgo } },
          ],
        },
        include: {
          operator: { select: { external_id: true, trading_name: true } },
          reporting_period: true,
        },
        orderBy: [{ submitted_at: "asc" }, { created_at: "asc" }],
        take: 5,
      }),
      this.prisma.client.licences.findMany({
        where: {
          status: "active",
          expires_at: { lte: in90Days },
        },
        include: {
          operator: { select: { external_id: true, trading_name: true } },
        },
        orderBy: { expires_at: "asc" },
        take: 8,
      }),
      this.prisma.client.operators.findMany({
        where: { status: "active" },
        select: {
          external_id: true,
          trading_name: true,
          tax_paid: true,
          tax_due: true,
          updated_at: true,
        },
      }),
      this.prisma.client.aml_alerts.findMany({
        where: { status: { in: ["open", "escalated"] } },
        include: {
          operator: { select: { external_id: true, trading_name: true } },
        },
        orderBy: { created_at: "desc" },
        take: 8,
      }),
      this.prisma.client.enforcement_cases.findMany({
        where: { status: { in: ["open", "escalated"] } },
        include: {
          operator: { select: { external_id: true, trading_name: true } },
        },
        orderBy: { updated_at: "desc" },
        take: 8,
      }),
      this.prisma.client.documents.findMany({
        where: {
          uploaded_at: { gte: sevenDaysAgo },
          document_type: {
            in: ["monthly_return", "bank_statement", "audit_report"],
          },
        },
        include: {
          operator: { select: { external_id: true, trading_name: true } },
          submission: {
            select: { id: true, reporting_period: { select: { label: true } } },
          },
        },
        orderBy: { uploaded_at: "desc" },
        take: 20,
      }),
    ]);

    const items: AppNotification[] = [];
    const coveredSubmissionIds = new Set<string>();

    for (const submission of recentPendingSubmissions) {
      coveredSubmissionIds.add(submission.id);
      const submittedAt = submission.submitted_at ?? submission.created_at;
      items.push({
        id: `submission:recent:${submission.id}`,
        category: "new_submission",
        title: "New Submission",
        message: `${submission.operator.trading_name} submitted ${submission.reporting_period.label}`,
        href: `/submissions?status=pending&review=${submission.id}`,
        created_at: submittedAt.toISOString(),
        severity: "info",
      });
    }

    for (const submission of overduePendingSubmissions) {
      coveredSubmissionIds.add(submission.id);
      const submittedAt = submission.submitted_at ?? submission.created_at;
      items.push({
        id: `submission:overdue:${submission.id}`,
        category: "overdue_submission",
        title: "Overdue Submission",
        message: `${submission.operator.trading_name} — ${submission.reporting_period.label} pending review`,
        href: `/submissions?status=pending&review=${submission.id}`,
        created_at: submittedAt.toISOString(),
        severity: "warning",
      });
    }

    const docsByGroup = new Map<
      string,
      {
        operatorName: string;
        externalId: string;
        submissionId: string | null;
        periodLabel: string | null;
        docs: Array<{ title: string; uploaded_at: Date }>;
      }
    >();

    for (const document of recentDocuments) {
      if (
        document.submission_id &&
        coveredSubmissionIds.has(document.submission_id)
      ) {
        continue;
      }

      const groupKey =
        document.submission_id ??
        `operator:${document.operator.external_id}:${document.uploaded_at.toISOString().slice(0, 10)}`;

      const existing = docsByGroup.get(groupKey);
      if (existing) {
        existing.docs.push({
          title: document.title,
          uploaded_at: document.uploaded_at,
        });
        continue;
      }

      docsByGroup.set(groupKey, {
        operatorName: document.operator.trading_name,
        externalId: document.operator.external_id,
        submissionId: document.submission_id,
        periodLabel: document.submission?.reporting_period?.label ?? null,
        docs: [{ title: document.title, uploaded_at: document.uploaded_at }],
      });
    }

    for (const [groupKey, group] of docsByGroup) {
      const latestUpload = group.docs.reduce(
        (latest, doc) =>
          doc.uploaded_at > latest ? doc.uploaded_at : latest,
        group.docs[0]!.uploaded_at,
      );
      const count = group.docs.length;
      const periodSuffix = group.periodLabel ? ` (${group.periodLabel})` : "";
      const href = group.submissionId
        ? `/submissions?status=pending&review=${group.submissionId}`
        : `/operators/${group.externalId}?tab=documents`;

      items.push({
        id: `document:${groupKey}`,
        category: "document_uploaded",
        title: "Document Uploaded",
        message:
          count === 1
            ? `${group.operatorName} uploaded ${group.docs[0]!.title}${periodSuffix}`
            : `${group.operatorName} uploaded ${count} documents${periodSuffix}`,
        href,
        created_at: latestUpload.toISOString(),
        severity: "info",
      });
    }

    for (const licence of expiringLicences) {
      const urgent = licence.expires_at <= in7Days;
      items.push({
        id: `licence:${licence.id}`,
        category: "licence_expiry",
        title: "Licence Expiry Alert",
        message: licenceExpiryMessage(
          licence.operator.trading_name,
          licence.expires_at,
          now,
        ),
        href: `/operators/${licence.operator.external_id}`,
        created_at: licence.expires_at.toISOString(),
        severity: urgent ? "danger" : "warning",
      });
    }

    const arrearsAlerts = highArrears
      .map((op) => ({
        external_id: op.external_id,
        trading_name: op.trading_name,
        tax_outstanding: Math.max(
          0,
          Number(op.tax_due ?? 0) - Number(op.tax_paid ?? 0),
        ),
        updated_at: op.updated_at,
      }))
      .filter((op) => op.tax_outstanding > 1_000_000)
      .sort((a, b) => b.tax_outstanding - a.tax_outstanding)
      .slice(0, 5);

    for (const arrears of arrearsAlerts) {
      items.push({
        id: `tax:${arrears.external_id}`,
        category: "tax_arrears",
        title: "Tax Arrears",
        message: `${arrears.trading_name} — Ksh ${arrears.tax_outstanding.toLocaleString("en-KE")} outstanding`,
        href: `/operators/${arrears.external_id}`,
        created_at: arrears.updated_at.toISOString(),
        severity: "danger",
      });
    }

    for (const alert of openAmlAlerts) {
      items.push({
        id: `aml:${alert.id}`,
        category: "aml_alert",
        title: "AML Alert",
        message: `${alert.operator.trading_name} — ${AML_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}`,
        href: `/payments/aml?alert=${alert.id}`,
        created_at: alert.created_at.toISOString(),
        severity:
          alert.severity === "high"
            ? "danger"
            : alert.severity === "medium"
              ? "warning"
              : "info",
      });
    }

    for (const enforcementCase of openEnforcementCases) {
      items.push({
        id: `enforcement:${enforcementCase.id}`,
        category: "enforcement_update",
        title: "Enforcement Update",
        message:
          enforcementCase.status === "escalated"
            ? `Case ${enforcementCase.case_number} escalated — ${enforcementCase.title}`
            : `Case ${enforcementCase.case_number} requires attention — ${enforcementCase.title}`,
        href: `/enforcement/${enforcementCase.id}`,
        created_at: enforcementCase.updated_at.toISOString(),
        severity: enforcementCase.status === "escalated" ? "danger" : "warning",
      });
    }

    const sorted = items
      .sort((a, b) => {
        const severityDiff =
          SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      })
      .slice(0, 20);

    return {
      items: sorted,
      unread_count: sorted.length,
    };
  }
}
