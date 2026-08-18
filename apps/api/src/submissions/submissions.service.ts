import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

function serializeSubmission(submission: Record<string, unknown>) {
  const numericFields = [
    "gross_revenue",
    "prizes_paid",
    "expenses",
    "gross_gaming_revenue",
    "tax_due",
    "tax_paid",
    "tax_outstanding",
  ];
  const result = { ...submission };
  for (const field of numericFields) {
    if (result[field] != null) {
      result[field] = String(result[field]);
    }
  }
  if (result.tickets_sold != null) {
    result.tickets_sold = String(result.tickets_sold);
  }
  return result;
}

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters?: {
    status?: string;
    operator_external_id?: string;
    reporting_period_id?: string;
  }) {
    const where: Prisma.submissionsWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as Prisma.Enumsubmission_statusFilter;
    }

    if (filters?.operator_external_id) {
      where.operator = { external_id: filters.operator_external_id };
    }

    if (filters?.reporting_period_id) {
      where.reporting_period_id = filters.reporting_period_id;
    }

    const submissions = await this.prisma.client.submissions.findMany({
      where,
      include: {
        operator: {
          select: {
            id: true,
            external_id: true,
            trading_name: true,
            compliance_status: true,
          },
        },
        reporting_period: true,
        reviewer: { select: { id: true, full_name: true, email: true } },
      },
      orderBy: [{ submitted_at: "desc" }, { created_at: "desc" }],
    });

    return submissions.map((s) =>
      serializeSubmission(s as unknown as Record<string, unknown>),
    );
  }

  async statusCounts(): Promise<Record<string, number>> {
    const groups = await this.prisma.client.submissions.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const counts: Record<string, number> = {
      approved: 0,
      pending: 0,
      revision_requested: 0,
      rejected: 0,
    };

    for (const group of groups) {
      counts[group.status] = group._count._all;
    }

    return counts;
  }

  async getById(id: string) {
    const submission = await this.prisma.client.submissions.findUnique({
      where: { id },
      include: {
        operator: true,
        reporting_period: true,
        reviewer: { select: { id: true, full_name: true, email: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException("Submission not found");
    }

    return serializeSubmission(submission as unknown as Record<string, unknown>);
  }

  async listForOperator(externalId: string) {
    return this.list({ operator_external_id: externalId });
  }

  async review(
    id: string,
    reviewerId: string,
    status: "approved" | "rejected" | "revision_requested",
    notes?: string,
  ) {
    await this.getById(id);

    const submission = await this.prisma.client.submissions.update({
      where: { id },
      data: {
        status,
        notes,
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        reporting_period: true,
      },
    });

    return serializeSubmission(submission as unknown as Record<string, unknown>);
  }

  toCsv(submissions: Array<Record<string, unknown>>): string {
    const headers = [
      "operator_id",
      "operator_name",
      "period",
      "status",
      "ggr",
      "tax_due",
      "tax_paid",
      "tax_outstanding",
      "submitted_at",
    ];
    const rows = submissions.map((s) => {
      const op = s.operator as { external_id?: string; trading_name?: string };
      const period = s.reporting_period as { label?: string };
      return [
        op?.external_id ?? "",
        op?.trading_name ?? "",
        period?.label ?? "",
        s.status ?? "",
        s.gross_gaming_revenue ?? "",
        s.tax_due ?? "",
        s.tax_paid ?? "",
        s.tax_outstanding ?? "",
        s.submitted_at ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  }
}
