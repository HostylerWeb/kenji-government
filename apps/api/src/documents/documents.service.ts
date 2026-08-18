import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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
    meta: { title: string; document_type: string },
    file: { filename: string; mimetype: string; buffer: Buffer },
  ) {
    return this.uploadFile(externalId, meta, file, null);
  }

  private async uploadFile(
    externalId: string,
    meta: { title: string; document_type: string },
    file: { filename: string; mimetype: string; buffer: Buffer },
    uploaderId: string | null,
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
        document_type: meta.document_type as never,
        title: meta.title,
        file_path: relativePath,
        file_size: BigInt(file.buffer.length),
        mime_type: file.mimetype,
        uploaded_by: uploaderId,
      },
      include: {
        uploader: { select: { id: true, full_name: true } },
      },
    });

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
