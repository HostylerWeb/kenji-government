import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateEnforcementCaseDto,
  CreateEnforcementActionDto,
} from "./dto/enforcement.dto";

@Injectable()
export class EnforcementService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOperatorId(externalId: string) {
    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: externalId },
      select: { id: true },
    });
    if (!operator) {
      throw new NotFoundException(`Operator ${externalId} not found`);
    }
    return operator.id;
  }

  async listCases(filters?: { status?: string; operator_external_id?: string }) {
    const where: Prisma.enforcement_casesWhereInput = {};
    if (filters?.status) {
      where.status = filters.status as Prisma.Enumenforcement_case_statusFilter;
    }
    if (filters?.operator_external_id) {
      where.operator = { external_id: filters.operator_external_id };
    }

    return this.prisma.client.enforcement_cases.findMany({
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
        opener: { select: { id: true, full_name: true } },
        actions: {
          include: { performer: { select: { id: true, full_name: true } } },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async getCase(caseId: string) {
    const caseRecord = await this.prisma.client.enforcement_cases.findUnique({
      where: { id: caseId },
      include: {
        operator: true,
        opener: { select: { id: true, full_name: true, email: true } },
        actions: {
          include: { performer: { select: { id: true, full_name: true } } },
          orderBy: { created_at: "asc" },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException("Enforcement case not found");
    }

    return caseRecord;
  }

  async createCase(
    externalId: string,
    openerId: string,
    dto: CreateEnforcementCaseDto,
  ) {
    const operatorId = await this.getOperatorId(externalId);
    const caseNumber = `ENF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const existing = await this.prisma.client.enforcement_cases.findUnique({
      where: { case_number: caseNumber },
    });
    if (existing) {
      throw new ConflictException("Case number collision, retry");
    }

    return this.prisma.client.enforcement_cases.create({
      data: {
        operator_id: operatorId,
        case_number: caseNumber,
        case_type: dto.case_type,
        title: dto.title,
        description: dto.description,
        opened_by: openerId,
        status: "open",
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
      },
    });
  }

  async addAction(
    caseId: string,
    performerId: string,
    dto: CreateEnforcementActionDto,
  ) {
    const caseRecord = await this.getCase(caseId);

    const action = await this.prisma.client.enforcement_actions.create({
      data: {
        enforcement_case_id: caseId,
        action_type: dto.action_type,
        details: dto.details,
        fine_amount: dto.fine_amount ?? null,
        performed_by: performerId,
      },
      include: { performer: { select: { id: true, full_name: true } } },
    });

    if (dto.action_type === "suspension" || dto.action_type === "revocation") {
      await this.prisma.client.operators.update({
        where: { id: caseRecord.operator_id },
        data: {
          status: dto.action_type === "revocation" ? "revoked" : "suspended",
          compliance_status: "non_compliant",
        },
      });
      await this.prisma.client.enforcement_cases.update({
        where: { id: caseId },
        data: { status: "escalated" },
      });
    }

    return action;
  }

  async listForOperator(externalId: string) {
    return this.listCases({ operator_external_id: externalId });
  }
}
