import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "@kenji-government/shared";
import { isSuperAdmin } from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { EnforcementService } from "../enforcement/enforcement.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly enforcement: EnforcementService,
  ) {}

  async overview() {
    const todayStart = this.eatTodayStart();
    const [
      completedToday,
      failedToday,
      earmarkedToday,
      withdrawnToday,
      earmarkedBalance,
      openAlerts,
      pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.client.payment_transactions.aggregate({
        where: { status: "completed", completed_at: { gte: todayStart } },
        _count: { _all: true },
        _sum: { gross_amount: true, tax_amount: true },
      }),
      this.prisma.client.payment_transactions.count({
        where: { status: "failed", created_at: { gte: todayStart } },
      }),
      this.prisma.client.tax_escrow_entries.aggregate({
        where: { status: "earmarked", earmarked_at: { gte: todayStart } },
        _sum: { tax_amount: true },
        _count: { _all: true },
      }),
      this.prisma.client.tax_escrow_entries.aggregate({
        where: { status: "withdrawn", earmarked_at: { gte: todayStart } },
        _sum: { tax_amount: true },
      }),
      this.prisma.client.tax_escrow_entries.aggregate({
        where: { status: "earmarked" },
        _sum: { tax_amount: true },
        _count: { _all: true },
      }),
      this.prisma.client.aml_alerts.count({ where: { status: "open" } }),
      this.prisma.client.tax_withdrawal_batches.count({
        where: { status: "pending" },
      }),
    ]);

    const completedCount = completedToday._count._all;
    const attempted = completedCount + failedToday;
    const successRate =
      attempted > 0 ? Math.round((completedCount / attempted) * 100) : 100;

    return {
      payments_today: completedCount,
      failed_today: failedToday,
      success_rate: successRate,
      gross_today: completedToday._sum.gross_amount?.toString() ?? "0",
      tax_earmarked_today: earmarkedToday._sum.tax_amount?.toString() ?? "0",
      tax_withdrawn_today: withdrawnToday._sum.tax_amount?.toString() ?? "0",
      earmarked_balance: earmarkedBalance._sum.tax_amount?.toString() ?? "0",
      earmarked_entry_count: earmarkedBalance._count._all,
      tax_rate: await this.settings.getTaxRate(),
      open_aml_alerts: openAlerts,
      pending_withdrawal_batches: pendingWithdrawals,
    };
  }

  async listTransactions(params: {
    status?: string;
    operator_external_id?: string;
    search?: string;
    aml_flag?: boolean;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 200);
    const where: Prisma.payment_transactionsWhereInput = {};

    if (params.status) {
      where.status = params.status as Prisma.Enumpayment_transaction_statusFilter;
    }

    if (params.operator_external_id) {
      const op = await this.prisma.client.operators.findUnique({
        where: { external_id: params.operator_external_id },
      });
      if (!op) throw new NotFoundException("Operator not found");
      where.operator_id = op.id;
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { external_transaction_id: { contains: term, mode: "insensitive" } },
        { ticket_reference: { contains: term, mode: "insensitive" } },
      ];
    }

    if (params.aml_flag) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { aml_risk_score: { gte: 50 } },
            { aml_alerts: { some: {} } },
          ],
        },
      ];
    }

    const rows = await this.prisma.client.payment_transactions.findMany({
      where,
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        aml_alerts: { select: { id: true, severity: true, status: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      ...this.serializeTransaction(row),
      has_aml_alert: row.aml_alerts.length > 0,
      aml_alerts: row.aml_alerts,
    }));
  }

  async getTransaction(id: string) {
    const row = await this.prisma.client.payment_transactions.findUnique({
      where: { id },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        tax_escrow_entries: true,
        aml_alerts: true,
      },
    });
    if (!row) throw new NotFoundException("Payment transaction not found");
    return {
      ...this.serializeTransaction(row),
      tax_escrow_entries: row.tax_escrow_entries.map((e) => ({
        id: e.id,
        tax_amount: e.tax_amount.toString(),
        status: e.status,
        earmarked_at: e.earmarked_at,
      })),
      aml_alerts: row.aml_alerts,
    };
  }

  async taxEscrowSummary() {
    const [earmarked, withdrawn, reversed] = await Promise.all([
      this.prisma.client.tax_escrow_entries.aggregate({
        where: { status: "earmarked" },
        _sum: { tax_amount: true },
        _count: { _all: true },
      }),
      this.prisma.client.tax_escrow_entries.aggregate({
        where: { status: "withdrawn" },
        _sum: { tax_amount: true },
        _count: { _all: true },
      }),
      this.prisma.client.tax_escrow_entries.aggregate({
        where: { status: "reversed" },
        _sum: { tax_amount: true },
        _count: { _all: true },
      }),
    ]);

    const withdrawals = await this.listWithdrawalBatches(20);

    return {
      earmarked_balance: earmarked._sum.tax_amount?.toString() ?? "0",
      earmarked_count: earmarked._count._all,
      withdrawn_total: withdrawn._sum.tax_amount?.toString() ?? "0",
      withdrawn_count: withdrawn._count._all,
      reversed_total: reversed._sum.tax_amount?.toString() ?? "0",
      withdrawal_batches: withdrawals,
    };
  }

  async listTaxEscrow(params: { status?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 50, 200);
    const where: Prisma.tax_escrow_entriesWhereInput = {};
    if (params.status) {
      where.status = params.status as Prisma.Enumtax_escrow_statusFilter;
    }

    const rows = await this.prisma.client.tax_escrow_entries.findMany({
      where,
      include: {
        payment_transaction: {
          include: {
            operator: { select: { external_id: true, trading_name: true } },
          },
        },
      },
      orderBy: { earmarked_at: "desc" },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      tax_amount: row.tax_amount.toString(),
      status: row.status,
      earmarked_at: row.earmarked_at,
      payment_transaction_id: row.payment_transaction_id,
      operator_external_id: row.payment_transaction.operator.external_id,
      operator_name: row.payment_transaction.operator.trading_name,
      gross_amount: row.payment_transaction.gross_amount.toString(),
    }));
  }

  async listWithdrawalBatches(limit = 30) {
    const rows = await this.prisma.client.tax_withdrawal_batches.findMany({
      orderBy: { created_at: "desc" },
      take: Math.min(limit, 100),
      include: {
        initiator: { select: { full_name: true, email: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      business_date: row.business_date,
      total_amount: row.total_amount.toString(),
      destination_account_ref: row.destination_account_ref,
      gateway_batch_id: row.gateway_batch_id,
      status: row.status,
      completed_at: row.completed_at,
      created_at: row.created_at,
      initiated_by: row.initiator
        ? { full_name: row.initiator.full_name, email: row.initiator.email }
        : null,
    }));
  }

  async initiateWithdrawal(user: AuthUser, businessDate?: string) {
    if (!isSuperAdmin(user.role) && user.role !== "supervisor") {
      throw new ForbiddenException(
        "Only supervisors or super administrators may initiate withdrawals",
      );
    }

    const date = businessDate
      ? new Date(`${businessDate}T00:00:00.000Z`)
      : this.yesterdayEatDate();

    const existing = await this.prisma.client.tax_withdrawal_batches.findFirst({
      where: { business_date: date, status: { in: ["pending", "completed"] } },
    });
    if (existing) {
      throw new BadRequestException(
        "Withdrawal batch already exists for this business date",
      );
    }

    const earmarked = await this.prisma.client.tax_escrow_entries.findMany({
      where: { status: "earmarked" },
      include: { payment_transaction: true },
    });

    const filtered = earmarked.filter((entry) => {
      const completed = entry.payment_transaction.completed_at;
      if (!completed) return false;
      const completedDate = completed.toISOString().slice(0, 10);
      const targetDate = date.toISOString().slice(0, 10);
      return completedDate <= targetDate;
    });

    const total = filtered.reduce(
      (sum, e) => sum + Number(e.tax_amount),
      0,
    );

    if (total <= 0) {
      throw new BadRequestException("No earmarked tax available for withdrawal");
    }

    const destination = await this.settings.getTreasuryAccountRef();
    const batch = await this.prisma.client.tax_withdrawal_batches.create({
      data: {
        business_date: date,
        total_amount: total,
        destination_account_ref: destination,
        status: "pending",
        initiated_by: user.id,
      },
    });

    await this.prisma.client.tax_escrow_entries.updateMany({
      where: { id: { in: filtered.map((e) => e.id) } },
      data: { withdrawal_batch_id: batch.id },
    });

    await this.prisma.client.audit_logs.create({
      data: {
        user_id: user.id,
        action: "tax_withdrawal.initiated",
        entity_type: "tax_withdrawal_batches",
        entity_id: batch.id,
        metadata: { total_amount: total, business_date: date.toISOString() },
      },
    });

    return {
      id: batch.id,
      business_date: batch.business_date,
      total_amount: batch.total_amount.toString(),
      status: batch.status,
      entry_count: filtered.length,
    };
  }

  async completeWithdrawal(user: AuthUser, batchId: string, gatewayBatchId?: string) {
    if (!isSuperAdmin(user.role)) {
      throw new ForbiddenException(
        "Only super administrators may complete withdrawal batches",
      );
    }

    const batch = await this.prisma.client.tax_withdrawal_batches.findUnique({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundException("Withdrawal batch not found");
    if (batch.status !== "pending") {
      throw new BadRequestException("Batch is not pending");
    }

    await this.prisma.client.$transaction([
      this.prisma.client.tax_withdrawal_batches.update({
        where: { id: batchId },
        data: {
          status: "completed",
          gateway_batch_id: gatewayBatchId ?? `manual-${Date.now()}`,
          completed_at: new Date(),
        },
      }),
      this.prisma.client.tax_escrow_entries.updateMany({
        where: { withdrawal_batch_id: batchId },
        data: { status: "withdrawn" },
      }),
    ]);

    await this.prisma.client.audit_logs.create({
      data: {
        user_id: user.id,
        action: "tax_withdrawal.completed",
        entity_type: "tax_withdrawal_batches",
        entity_id: batchId,
      },
    });

    return { id: batchId, status: "completed" };
  }

  async listAmlAlerts(params: { status?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 50, 200);
    const where: Prisma.aml_alertsWhereInput = {};
    if (params.status) {
      where.status = params.status as Prisma.Enumaml_alert_statusFilter;
    }

    const rows = await this.prisma.client.aml_alerts.findMany({
      where,
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        payment_transaction: {
          select: {
            id: true,
            external_transaction_id: true,
            gross_amount: true,
            kyc_status: true,
            aml_risk_score: true,
          },
        },
      },
      orderBy: [{ severity: "desc" }, { created_at: "desc" }],
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      alert_type: row.alert_type,
      severity: row.severity,
      status: row.status,
      details: row.details,
      created_at: row.created_at,
      operator: row.operator,
      payment_transaction: row.payment_transaction
        ? {
            ...row.payment_transaction,
            gross_amount: row.payment_transaction.gross_amount.toString(),
          }
        : null,
    }));
  }

  async updateAmlAlert(
    user: AuthUser,
    id: string,
    status: "reviewed" | "escalated" | "closed",
  ) {
    const alert = await this.prisma.client.aml_alerts.findUnique({
      where: { id },
    });
    if (!alert) throw new NotFoundException("AML alert not found");

    return this.prisma.client.aml_alerts.update({
      where: { id },
      data: {
        status,
        reviewed_by: user.id,
      },
    });
  }

  async escalateAmlToEnforcement(user: AuthUser, alertId: string) {
    const alert = await this.prisma.client.aml_alerts.findUnique({
      where: { id: alertId },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        payment_transaction: {
          select: { external_transaction_id: true, gross_amount: true },
        },
      },
    });
    if (!alert) throw new NotFoundException("AML alert not found");

    const existingDetails =
      alert.details && typeof alert.details === "object"
        ? (alert.details as Record<string, unknown>)
        : {};

    if (existingDetails.enforcement_case_id) {
      return {
        enforcement_case_id: existingDetails.enforcement_case_id,
        message: "Already linked to enforcement case",
      };
    }

    const title = `AML ${alert.alert_type} — ${alert.operator.trading_name}`;
    const paymentRef = alert.payment_transaction?.external_transaction_id;
    const description = [
      `AML alert escalated to enforcement.`,
      `Alert type: ${alert.alert_type.replace(/_/g, " ")}`,
      `Severity: ${alert.severity}`,
      paymentRef ? `Payment reference: ${paymentRef}` : null,
      existingDetails.reason
        ? `Reason: ${String(existingDetails.reason)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const caseRecord = await this.enforcement.createCase(
      alert.operator.external_id,
      user.id,
      {
        title,
        description,
        case_type: "investigation",
        nature: "aml_concern",
        priority: alert.severity === "high" ? "high" : alert.severity === "medium" ? "medium" : "low",
        requires_operator_response: true,
        is_internal: false,
        required_documents:
          "Bank statements, source-of-funds documentation, and transaction audit trail for flagged payments.",
        allegations_summary:
          `Investigate suspected ${alert.alert_type.replace(/_/g, " ")} activity linked to this operator's payment flow.`,
      },
    );

    await this.prisma.client.aml_alerts.update({
      where: { id: alertId },
      data: {
        status: "escalated",
        reviewed_by: user.id,
        details: {
          ...existingDetails,
          enforcement_case_id: caseRecord.id,
          enforcement_case_number: caseRecord.case_number,
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.client.audit_logs.create({
      data: {
        user_id: user.id,
        action: "aml_alert.escalated_to_enforcement",
        entity_type: "aml_alerts",
        entity_id: alertId,
        metadata: {
          enforcement_case_id: caseRecord.id,
          case_number: caseRecord.case_number,
        },
      },
    });

    return {
      alert_id: alertId,
      enforcement_case_id: caseRecord.id,
      case_number: caseRecord.case_number,
    };
  }

  async operatorStats() {
    const grouped = await this.prisma.client.payment_transactions.groupBy({
      by: ["operator_id", "status"],
      _count: { _all: true },
      _sum: {
        gross_amount: true,
        tax_amount: true,
        gateway_fee_amount: true,
        operator_amount: true,
      },
    });

    const operators = await this.prisma.client.operators.findMany({
      select: { id: true, external_id: true, trading_name: true },
    });

    const byOperator = new Map<
      string,
      {
        external_id: string;
        trading_name: string;
        completed: number;
        failed: number;
        gross_total: number;
        tax_total: number;
        gateway_fee_total: number;
        operator_net_total: number;
      }
    >();

    for (const op of operators) {
      byOperator.set(op.id, {
        external_id: op.external_id,
        trading_name: op.trading_name,
        completed: 0,
        failed: 0,
        gross_total: 0,
        tax_total: 0,
        gateway_fee_total: 0,
        operator_net_total: 0,
      });
    }

    for (const row of grouped) {
      const entry = byOperator.get(row.operator_id);
      if (!entry) continue;
      if (row.status === "completed") {
        entry.completed = row._count._all;
        entry.gross_total += Number(row._sum.gross_amount ?? 0);
        entry.tax_total += Number(row._sum.tax_amount ?? 0);
        entry.gateway_fee_total += Number(row._sum.gateway_fee_amount ?? 0);
        entry.operator_net_total +=
          Number(row._sum.operator_amount ?? 0) -
          Number(row._sum.gateway_fee_amount ?? 0);
      } else if (row.status === "failed") {
        entry.failed = row._count._all;
      }
    }

    return [...byOperator.values()]
      .filter((o) => o.completed > 0 || o.failed > 0)
      .map((o) => {
        const attempted = o.completed + o.failed;
        const effectiveFeeRate =
          o.gross_total > 0
            ? Math.round((o.gateway_fee_total / o.gross_total) * 10000) / 100
            : 0;
        return {
          operator_external_id: o.external_id,
          trading_name: o.trading_name,
          transaction_count: o.completed,
          failed_count: o.failed,
          failure_rate:
            attempted > 0 ? Math.round((o.failed / attempted) * 100) : 0,
          gross_total: o.gross_total.toFixed(2),
          gateway_fee_rate: effectiveFeeRate,
          gateway_fee_total: o.gateway_fee_total.toFixed(2),
          tax_total: o.tax_total.toFixed(2),
          operator_net_total: o.operator_net_total.toFixed(2),
        };
      })
      .sort((a, b) => Number(b.gross_total) - Number(a.gross_total));
  }

  private serializeTransaction(
    row: {
      id: string;
      external_transaction_id: string;
      ticket_reference: string | null;
      gross_amount: { toString: () => string };
      operator_amount: { toString: () => string };
      tax_amount: { toString: () => string };
      tax_rate: { toString: () => string };
      gateway_fee_rate: { toString: () => string };
      gateway_fee_amount: { toString: () => string };
      currency: string;
      status: string;
      kyc_status: string;
      aml_risk_score: number;
      payer_fingerprint: string | null;
      county: string | null;
      completed_at: Date | null;
      created_at: Date;
      operator?: { external_id: string; trading_name: string };
    },
  ) {
    return {
      id: row.id,
      external_transaction_id: row.external_transaction_id,
      ticket_reference: row.ticket_reference,
      gross_amount: row.gross_amount.toString(),
      operator_amount: row.operator_amount.toString(),
      tax_amount: row.tax_amount.toString(),
      tax_rate: row.tax_rate.toString(),
      gateway_fee_rate: row.gateway_fee_rate.toString(),
      gateway_fee_amount: row.gateway_fee_amount.toString(),
      operator_net: (
        Number(row.operator_amount.toString()) -
        Number(row.gateway_fee_amount.toString())
      ).toFixed(2),
      currency: row.currency,
      status: row.status,
      kyc_status: row.kyc_status,
      aml_risk_score: row.aml_risk_score,
      payer_fingerprint: row.payer_fingerprint,
      county: row.county,
      completed_at: row.completed_at,
      created_at: row.created_at,
      operator_external_id: row.operator?.external_id,
      operator_name: row.operator?.trading_name,
    };
  }

  private eatTodayStart(): Date {
    const dateStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Nairobi",
    });
    return new Date(`${dateStr}T00:00:00.000Z`);
  }

  private yesterdayEatDate(): Date {
    const today = this.eatTodayStart();
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return yesterday;
  }
}
