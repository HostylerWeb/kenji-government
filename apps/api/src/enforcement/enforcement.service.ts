import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  createEnforcementCaseSchema,
  type EnforcementCaseMetadata,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  CreateEnforcementCaseDto,
  CreateEnforcementActionDto,
  RequestEnforcementDocumentsDto,
} from "./dto/enforcement.dto";

function buildOpeningActionDetails(
  dto: {
    title: string;
    description: string;
    allegations_summary?: string;
  },
  metadata: EnforcementCaseMetadata,
): string {
  const lines = [
    `Case opened: ${dto.title}`,
    `Summary: ${dto.description}`,
    `Nature: ${metadata.nature.replace(/_/g, " ")}`,
    `Priority: ${metadata.priority}`,
    metadata.is_internal
      ? "Scope: Internal GRA investigation"
      : "Scope: Operator-facing enforcement",
    metadata.requires_operator_response
      ? "Operator response required"
      : "No immediate operator response required",
  ];

  if (dto.allegations_summary?.trim()) {
    lines.push(`Allegations: ${dto.allegations_summary.trim()}`);
  }

  if (metadata.has_financial_penalty && metadata.fine_amount) {
    lines.push(`Financial penalty: KES ${metadata.fine_amount}`);
    if (metadata.fine_due_by) {
      lines.push(`Payment due by: ${metadata.fine_due_by}`);
    }
    if (metadata.fine_payment_notes?.trim()) {
      lines.push(`Payment instructions: ${metadata.fine_payment_notes.trim()}`);
    }
  }

  if (metadata.has_supporting_evidence && metadata.supporting_evidence_notes?.trim()) {
    lines.push(`Evidence on file: ${metadata.supporting_evidence_notes.trim()}`);
  }

  if (metadata.required_documents?.trim()) {
    lines.push(`Documents required: ${metadata.required_documents.trim()}`);
  }

  return lines.join("\n");
}

@Injectable()
export class EnforcementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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

  async listCases(filters?: {
    status?: string;
    operator_external_id?: string;
    bucket?: "open" | "resolved";
  }) {
    const where: Prisma.enforcement_casesWhereInput = {};
    if (filters?.bucket === "open") {
      where.status = { in: ["open", "escalated"] };
    } else if (filters?.bucket === "resolved") {
      where.status = { in: ["resolved", "closed"] };
    } else if (filters?.status) {
      where.status = filters.status as Prisma.Enumenforcement_case_statusFilter;
    }
    if (filters?.operator_external_id) {
      where.operator = { external_id: filters.operator_external_id };
    }

    const cases = await this.prisma.client.enforcement_cases.findMany({
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
          take: 3,
        },
      },
      orderBy: { created_at: "desc" },
    });

    return cases.filter((caseRecord) => {
      const metadata = caseRecord.metadata as Record<string, unknown> | null;
      return metadata?.quick_warning !== true;
    });
  }

  async listWarnings(filters?: { operator_external_id?: string }) {
    const where: Prisma.enforcement_actionsWhereInput = {
      action_type: "warning",
    };
    if (filters?.operator_external_id) {
      where.case = { operator: { external_id: filters.operator_external_id } };
    }

    return this.prisma.client.enforcement_actions.findMany({
      where,
      include: {
        performer: { select: { id: true, full_name: true } },
        case: {
          select: {
            id: true,
            case_number: true,
            title: true,
            operator: {
              select: { external_id: true, trading_name: true },
            },
          },
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
    const parsed = createEnforcementCaseSchema.safeParse({
      ...dto,
      has_financial_penalty:
        dto.has_financial_penalty ?? dto.case_type === "fine",
    });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new BadRequestException(
        firstIssue?.message ?? "Invalid enforcement case data",
      );
    }
    const input = parsed.data;
    const penaltyApplies =
      input.has_financial_penalty || input.case_type === "fine";

    const operatorId = await this.getOperatorId(externalId);
    const caseNumber = `ENF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const existing = await this.prisma.client.enforcement_cases.findUnique({
      where: { case_number: caseNumber },
    });
    if (existing) {
      throw new ConflictException("Case number collision, retry");
    }

    const metadata: EnforcementCaseMetadata = {
      nature: input.nature,
      priority: input.priority ?? "medium",
      requires_operator_response: input.requires_operator_response ?? false,
      is_internal: input.is_internal ?? false,
      has_allegations: input.has_allegations ?? false,
      allegations_summary: input.has_allegations
        ? input.allegations_summary?.trim()
        : undefined,
      requires_documents: input.requires_documents ?? false,
      required_documents: input.requires_documents
        ? input.required_documents?.trim() || undefined
        : undefined,
      has_financial_penalty: penaltyApplies,
      fine_amount: penaltyApplies ? input.fine_amount?.trim() : undefined,
      fine_due_by: penaltyApplies ? input.fine_due_by?.trim() : undefined,
      fine_payment_notes: penaltyApplies
        ? input.fine_payment_notes?.trim() || undefined
        : undefined,
      has_supporting_evidence: input.has_supporting_evidence ?? false,
      supporting_evidence_notes: input.has_supporting_evidence
        ? input.supporting_evidence_notes?.trim()
        : undefined,
    };

    const description = input.description.trim();

    const caseRecord = await this.prisma.client.enforcement_cases.create({
      data: {
        operator_id: operatorId,
        case_number: caseNumber,
        case_type: input.case_type,
        title: input.title.trim(),
        description,
        metadata: metadata as unknown as Prisma.InputJsonValue,
        opened_by: openerId,
        status: "open",
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        opener: { select: { id: true, full_name: true } },
        actions: {
          include: { performer: { select: { id: true, full_name: true } } },
          orderBy: { created_at: "asc" },
        },
      },
    });

    await this.prisma.client.enforcement_actions.create({
      data: {
        enforcement_case_id: caseRecord.id,
        action_type: metadata.requires_operator_response ? "notice" : "notice",
        details: buildOpeningActionDetails(input, metadata),
        performed_by: openerId,
      },
    });

    await this.auditService.log({
      user_id: openerId,
      action: "enforcement_case_created",
      entity_type: "enforcement_cases",
      entity_id: caseRecord.id,
      category: "platform",
      metadata: {
        summary: `Opened ${caseRecord.case_number} — ${caseRecord.title}`,
        case_number: caseRecord.case_number,
        case_title: caseRecord.title,
        case_type: input.case_type,
        operator_name: caseRecord.operator?.trading_name,
        external_id: caseRecord.operator?.external_id,
      },
    });

    return this.getCase(caseRecord.id);
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

    await this.auditService.log({
      user_id: performerId,
      action: "enforcement_action_added",
      entity_type: "enforcement_cases",
      entity_id: caseId,
      category: "platform",
      metadata: {
        summary: `Recorded ${dto.action_type.replace(/_/g, " ")} on ${caseRecord.case_number}`,
        case_number: caseRecord.case_number,
        case_title: caseRecord.title,
        action_type: dto.action_type,
        details: dto.details,
        external_id: caseRecord.operator.external_id,
        operator_name: caseRecord.operator.trading_name,
      },
    });

    return action;
  }

  async requestDocuments(
    caseId: string,
    performerId: string,
    dto: RequestEnforcementDocumentsDto,
  ) {
    const caseRecord = await this.getCase(caseId);
    if (caseRecord.status === "resolved" || caseRecord.status === "closed") {
      throw new ConflictException("Cannot request documents on a closed case");
    }

    const existingMeta =
      (caseRecord.metadata as Record<string, unknown> | null) ?? {};
    const previousDocs =
      typeof existingMeta.required_documents === "string"
        ? existingMeta.required_documents
        : "";
    const requestDate = new Date().toISOString().slice(0, 10);
    const newDocumentsBlock = dto.documents.trim();
    const mergedDocuments = previousDocs
      ? `${previousDocs}\n\n--- Additional request (${requestDate}) ---\n${newDocumentsBlock}`
      : newDocumentsBlock;

    const metadata: EnforcementCaseMetadata = {
      nature: (existingMeta.nature as EnforcementCaseMetadata["nature"]) ?? "operational_breach",
      priority: (existingMeta.priority as EnforcementCaseMetadata["priority"]) ?? "medium",
      requires_operator_response: true,
      is_internal: Boolean(existingMeta.is_internal),
      has_allegations: Boolean(existingMeta.has_allegations),
      allegations_summary:
        typeof existingMeta.allegations_summary === "string"
          ? existingMeta.allegations_summary
          : undefined,
      requires_documents: true,
      required_documents: mergedDocuments,
      has_financial_penalty: Boolean(existingMeta.has_financial_penalty),
      fine_amount:
        typeof existingMeta.fine_amount === "string" ? existingMeta.fine_amount : undefined,
      fine_due_by:
        typeof existingMeta.fine_due_by === "string" ? existingMeta.fine_due_by : undefined,
      fine_payment_notes:
        typeof existingMeta.fine_payment_notes === "string"
          ? existingMeta.fine_payment_notes
          : undefined,
      has_supporting_evidence: Boolean(existingMeta.has_supporting_evidence),
      supporting_evidence_notes:
        typeof existingMeta.supporting_evidence_notes === "string"
          ? existingMeta.supporting_evidence_notes
          : undefined,
      pending_document_request: true,
      document_request_due_by: dto.due_by?.trim() || undefined,
    };

    await this.prisma.client.enforcement_cases.update({
      where: { id: caseId },
      data: {
        status: "open",
        metadata: metadata as unknown as Prisma.InputJsonValue,
      },
    });

    const details = [
      "Document request issued to operator. Case remains open pending upload.",
      `Documents/proofs required:\n${newDocumentsBlock}`,
      dto.due_by?.trim() ? `Due by: ${dto.due_by.trim()}` : null,
      dto.notes?.trim() ? `Notes: ${dto.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await this.prisma.client.enforcement_actions.create({
      data: {
        enforcement_case_id: caseId,
        action_type: "notice",
        details,
        performed_by: performerId,
      },
    });

    await this.auditService.log({
      user_id: performerId,
      action: "enforcement_documents_requested",
      entity_type: "enforcement_cases",
      entity_id: caseId,
      category: "platform",
      metadata: {
        summary: `Requested documents on ${caseRecord.case_number}`,
        case_number: caseRecord.case_number,
        case_title: caseRecord.title,
        documents: newDocumentsBlock,
        external_id: caseRecord.operator.external_id,
        operator_name: caseRecord.operator.trading_name,
      },
    });

    return this.getCase(caseId);
  }

  async resolveCase(caseId: string, performerId: string, notes?: string) {
    const caseRecord = await this.getCase(caseId);
    if (caseRecord.status === "resolved" || caseRecord.status === "closed") {
      throw new ConflictException("Case is already resolved");
    }

    await this.prisma.client.enforcement_actions.create({
      data: {
        enforcement_case_id: caseId,
        action_type: "notice",
        details: notes?.trim() || "Case marked as resolved.",
        performed_by: performerId,
      },
    });

    await this.prisma.client.enforcement_cases.update({
      where: { id: caseId },
      data: { status: "resolved" },
    });

    await this.auditService.log({
      user_id: performerId,
      action: "enforcement_case_resolved",
      entity_type: "enforcement_cases",
      entity_id: caseId,
      category: "platform",
      metadata: {
        summary: `Resolved ${caseRecord.case_number} — ${caseRecord.title}`,
        case_number: caseRecord.case_number,
        case_title: caseRecord.title,
        details: notes?.trim(),
        external_id: caseRecord.operator.external_id,
        operator_name: caseRecord.operator.trading_name,
      },
    });

    return this.getCase(caseId);
  }

  async deleteCase(caseId: string, performerId: string) {
    const caseRecord = await this.getCase(caseId);
    await this.prisma.client.enforcement_cases.delete({ where: { id: caseId } });

    await this.auditService.log({
      user_id: performerId,
      action: "enforcement_case_deleted",
      entity_type: "enforcement_cases",
      entity_id: caseId,
      category: "platform",
      metadata: {
        summary: `Deleted ${caseRecord.case_number} — ${caseRecord.title}`,
        case_number: caseRecord.case_number,
        case_title: caseRecord.title,
        external_id: caseRecord.operator.external_id,
        operator_name: caseRecord.operator.trading_name,
      },
    });

    return { success: true };
  }

  async listForOperator(externalId: string) {
    return this.listCases({ operator_external_id: externalId });
  }
}
