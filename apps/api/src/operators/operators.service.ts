import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOperatorDto, UpdateOperatorDto } from "./dto/operator.dto";
import { AuditService } from "../audit/audit.service";

function serializeOperator(operator: Record<string, unknown>) {
  return {
    ...operator,
    annual_ggr: operator.annual_ggr?.toString() ?? null,
    tax_paid: operator.tax_paid?.toString() ?? null,
    tax_due: operator.tax_due?.toString() ?? null,
  };
}

@Injectable()
export class OperatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(params?: {
    search?: string;
    region?: string;
    compliance_status?: string;
    status?: string;
  }) {
    const where: Prisma.operatorsWhereInput = {};

    if (params?.search) {
      where.OR = [
        { trading_name: { contains: params.search, mode: "insensitive" } },
        { legal_name: { contains: params.search, mode: "insensitive" } },
        { external_id: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params?.region) {
      where.region = params.region;
    }

    if (params?.compliance_status) {
      where.compliance_status =
        params.compliance_status as Prisma.Enumcompliance_statusFilter;
    }

    if (params?.status) {
      where.status = params.status as Prisma.Enumoperator_statusFilter;
    }

    const operators = await this.prisma.client.operators.findMany({
      where,
      orderBy: { trading_name: "asc" },
      include: {
        licences: { where: { status: "active" }, take: 1 },
        operator_sites: { where: { is_primary: true }, take: 1 },
      },
    });

    return operators.map((op) => serializeOperator(op as Record<string, unknown>));
  }

  async getByExternalId(externalId: string) {
    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: externalId },
      include: {
        licences: { orderBy: { expires_at: "desc" } },
        operator_sites: true,
        operator_monthly_snapshots: {
          include: { reporting_period: true },
          orderBy: { reporting_period: { year: "desc" } },
          take: 6,
        },
      },
    });

    if (!operator) {
      throw new NotFoundException(`Operator ${externalId} not found`);
    }

    const {
      licences,
      operator_sites,
      operator_monthly_snapshots,
      ...operatorBase
    } = operator;

    const snapshots = operator_monthly_snapshots.map((s) => ({
      id: s.id,
      gross_gaming_revenue: s.gross_gaming_revenue.toString(),
      tax_paid: s.tax_paid.toString(),
      tickets_sold: s.tickets_sold.toString(),
      reporting_period: s.reporting_period,
    }));

    return {
      ...serializeOperator(operatorBase as Record<string, unknown>),
      licences,
      operator_sites,
      monthly_snapshots: snapshots,
    };
  }

  async create(dto: CreateOperatorDto) {
    const existing = await this.prisma.client.operators.findUnique({
      where: { external_id: dto.external_id },
    });

    if (existing) {
      throw new ConflictException(
        `Operator with external_id ${dto.external_id} already exists`,
      );
    }

    const operator = await this.prisma.client.operators.create({
      data: dto,
    });

    return serializeOperator(operator as Record<string, unknown>);
  }

  async update(externalId: string, dto: UpdateOperatorDto) {
    await this.getByExternalId(externalId);

    const operator = await this.prisma.client.operators.update({
      where: { external_id: externalId },
      data: dto,
    });

    return serializeOperator(operator as Record<string, unknown>);
  }

  async dashboardStats() {
    const [total, compliant, atRisk, nonCompliant, aggregates] =
      await Promise.all([
        this.prisma.client.operators.count({ where: { status: "active" } }),
        this.prisma.client.operators.count({
          where: { compliance_status: "compliant", status: "active" },
        }),
        this.prisma.client.operators.count({
          where: { compliance_status: "at_risk", status: "active" },
        }),
        this.prisma.client.operators.count({
          where: { compliance_status: "non_compliant", status: "active" },
        }),
        this.prisma.client.operators.aggregate({
          where: { status: "active" },
          _sum: {
            annual_ggr: true,
            tax_paid: true,
            tax_due: true,
            monthly_tickets: true,
          },
        }),
      ]);

    return {
      total_active_operators: total,
      compliant_operators: compliant,
      at_risk_operators: atRisk,
      non_compliant_operators: nonCompliant,
      total_annual_ggr: aggregates._sum.annual_ggr?.toString() ?? "0",
      total_tax_paid: aggregates._sum.tax_paid?.toString() ?? "0",
      total_tax_due: aggregates._sum.tax_due?.toString() ?? "0",
      total_monthly_tickets: aggregates._sum.monthly_tickets ?? 0,
      compliance_rate: total > 0 ? Math.round((compliant / total) * 100) : 0,
    };
  }

  async issueWarning(externalId: string, userId: string, details?: string) {
    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: externalId },
    });
    if (!operator) throw new NotFoundException(`Operator ${externalId} not found`);

    const caseNumber = `ENF-${new Date().getFullYear()}-WARN-${Date.now().toString().slice(-5)}`;
    const caseRecord = await this.prisma.client.enforcement_cases.create({
      data: {
        operator_id: operator.id,
        case_number: caseNumber,
        case_type: "warning",
        title: `Formal warning — ${operator.trading_name}`,
        description: details,
        opened_by: userId,
        status: "open",
      },
    });

    await this.prisma.client.enforcement_actions.create({
      data: {
        enforcement_case_id: caseRecord.id,
        action_type: "warning",
        details: details ?? "Warning issued by GRA staff",
        performed_by: userId,
      },
    });

    if (operator.compliance_status === "compliant") {
      await this.prisma.client.operators.update({
        where: { id: operator.id },
        data: { compliance_status: "at_risk" },
      });
    }

    await this.auditService.log({
      user_id: userId,
      action: "operator_warning",
      entity_type: "operators",
      entity_id: operator.id,
      metadata: { external_id: externalId, details },
    });

    return { success: true, case_id: caseRecord.id, case_number: caseNumber };
  }

  async suspend(externalId: string, userId: string, details?: string) {
    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: externalId },
    });
    if (!operator) throw new NotFoundException(`Operator ${externalId} not found`);

    const caseNumber = `ENF-${new Date().getFullYear()}-SUSP-${Date.now().toString().slice(-5)}`;
    const caseRecord = await this.prisma.client.enforcement_cases.create({
      data: {
        operator_id: operator.id,
        case_number: caseNumber,
        case_type: "suspension",
        title: `Suspension — ${operator.trading_name}`,
        description: details,
        opened_by: userId,
        status: "escalated",
      },
    });

    await this.prisma.client.enforcement_actions.create({
      data: {
        enforcement_case_id: caseRecord.id,
        action_type: "suspension",
        details: details ?? "Operator suspended by GRA staff",
        performed_by: userId,
      },
    });

    await this.prisma.client.operators.update({
      where: { id: operator.id },
      data: { status: "suspended", compliance_status: "non_compliant" },
    });

    await this.auditService.log({
      user_id: userId,
      action: "operator_suspend",
      entity_type: "operators",
      entity_id: operator.id,
      metadata: { external_id: externalId, details },
    });

    return { success: true, case_id: caseRecord.id, case_number: caseNumber };
  }
}
