import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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

  async listForOperator(externalId: string) {
    const operatorId = await this.getOperatorId(externalId);
    const docs = await this.prisma.client.documents.findMany({
      where: { operator_id: operatorId },
      include: {
        uploader: { select: { id: true, full_name: true } },
      },
      orderBy: { uploaded_at: "desc" },
    });

    return docs.map((d) => ({
      ...d,
      file_size: d.file_size?.toString() ?? null,
    }));
  }

  async upload(
    externalId: string,
    uploaderId: string,
    meta: { title: string; document_type: string },
    file: { filename: string; mimetype: string; buffer: Buffer },
  ) {
    return this.uploadFile(externalId, meta, file, uploaderId);
  }

  async uploadFromIngest(
    externalId: string,
    meta: {
      title: string;
      document_type: string;
      reporting_year?: number;
      reporting_month?: number;
    },
    file: { filename: string; mimetype: string; buffer: Buffer },
  ) {
    const submissionId = await this.resolveSubmissionId(
      externalId,
      meta.reporting_year,
      meta.reporting_month,
    );
    return this.uploadFile(externalId, meta, file, null, submissionId);
  }

  private async resolveSubmissionId(
    externalId: string,
    reportingYear?: number,
    reportingMonth?: number,
  ): Promise<string | null> {
    if (!reportingYear || !reportingMonth) return null;

    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: externalId },
      select: { id: true },
    });
    if (!operator) return null;

    const submission = await this.prisma.client.submissions.findFirst({
      where: {
        operator_id: operator.id,
        reporting_period: {
          year: reportingYear,
          month: reportingMonth,
        },
      },
      select: { id: true },
    });

    return submission?.id ?? null;
  }

  private async uploadFile(
    externalId: string,
    meta: { title: string; document_type: string },
    file: { filename: string; mimetype: string; buffer: Buffer },
    uploaderId: string | null,
    submissionId: string | null = null,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("File is required");
    }

    const operatorId = await this.getOperatorId(externalId);
    const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const relativePath = `documents/${externalId}/${Date.now()}-${safeName}`;

    await this.storage.saveFile(relativePath, file.buffer);

    const document = await this.prisma.client.documents.create({
      data: {
        operator_id: operatorId,
        submission_id: submissionId,
        document_type: meta.document_type as never,
        title: meta.title,
        file_path: relativePath,
        file_size: BigInt(file.buffer.length),
        mime_type: file.mimetype,
        uploaded_by: uploaderId,
      },
      include: {
        uploader: { select: { id: true, full_name: true } },
        operator: { select: { external_id: true, trading_name: true } },
      },
    });

    if (uploaderId) {
      await this.auditService.log({
        user_id: uploaderId,
        action: "document_uploaded",
        entity_type: "documents",
        entity_id: document.id,
        category: "platform",
        metadata: {
          summary: `Uploaded ${meta.title} for ${document.operator.trading_name}`,
          title: meta.title,
          document_type: meta.document_type,
          external_id: document.operator.external_id,
          operator_name: document.operator.trading_name,
        },
      });
    }

    return {
      ...document,
      file_size: document.file_size?.toString() ?? null,
    };
  }

  async getDownload(id: string) {
    const document = await this.prisma.client.documents.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const buffer = await this.storage.readFile(document.file_path);
    return {
      buffer,
      mime_type: document.mime_type ?? "application/octet-stream",
      filename: document.title.replace(/\s+/g, "_"),
    };
  }
}
