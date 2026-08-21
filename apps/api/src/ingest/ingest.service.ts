import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import {
  heartbeatSchema,
  ingestDocumentTypeSchema,
  monthlyReturnSchema,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentsService } from "../documents/documents.service";
import { IngestQueueService } from "./ingest-queue.service";
import type { IngestSiteContext } from "./decorators/ingest-site.decorator";

@Injectable()
export class IngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly queue: IngestQueueService,
  ) {}

  async getStatus(site: IngestSiteContext) {
    const operatorSite = await this.prisma.client.operator_sites.findUnique({
      where: { id: site.siteId },
      include: {
        operator: {
          select: {
            external_id: true,
            trading_name: true,
            status: true,
            compliance_status: true,
          },
        },
      },
    });

    return {
      status: "ok",
      site_id: site.siteId,
      operator_external_id: site.operatorExternalId,
      operator_name: operatorSite?.operator.trading_name,
      operator_status: operatorSite?.operator.status,
      compliance_status: operatorSite?.operator.compliance_status,
      api_key_prefix: site.apiKeyPrefix,
    };
  }

  async heartbeat(site: IngestSiteContext, payload: unknown) {
    const parsed = heartbeatSchema.safeParse(payload ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    return {
      status: "ok",
      received_at: new Date().toISOString(),
      site_version: parsed.data.site_version,
    };
  }

  async submitMonthlyReturn(
    site: IngestSiteContext,
    payload: unknown,
    idempotencyKey: string,
  ) {
    const parsed = monthlyReturnSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.findIdempotentEvent(idempotencyKey);
    if (existing) {
      return this.formatIngestResponse(existing);
    }

    const event = await this.prisma.client.ingest_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: "monthly_return",
        idempotency_key: idempotencyKey,
        raw_payload: parsed.data,
        status: "received",
      },
    });

    await this.queue.enqueueMonthlyReturn(event.id);

    return this.formatIngestResponse(event);
  }

  async uploadDocument(
    site: IngestSiteContext,
    idempotencyKey: string,
    meta: {
      title: string;
      document_type: string;
      reporting_year?: number;
      reporting_month?: number;
    },
    file: { filename: string; mimetype: string; buffer: Buffer },
  ) {
    const docType = ingestDocumentTypeSchema.safeParse(meta.document_type);
    if (!docType.success) {
      throw new BadRequestException({
        document_type: "Invalid document_type",
      });
    }

    const existing = await this.findIdempotentEvent(idempotencyKey);
    if (existing) {
      return this.formatIngestResponse(existing);
    }

    const document = await this.documents.uploadFromIngest(
      site.operatorExternalId,
      { title: meta.title, document_type: docType.data },
      file,
    );

    const event = await this.prisma.client.ingest_events.create({
      data: {
        operator_site_id: site.siteId,
        event_type: "document",
        idempotency_key: idempotencyKey,
        raw_payload: {
          document_id: document.id,
          title: meta.title,
          document_type: meta.document_type,
          submission_id: document.submission_id,
          reporting_year: meta.reporting_year,
          reporting_month: meta.reporting_month,
        },
        status: "processed",
        processed_at: new Date(),
      },
    });

    return {
      ...this.formatIngestResponse(event),
      document_id: document.id,
    };
  }

  private async findIdempotentEvent(idempotencyKey: string) {
    return this.prisma.client.ingest_events.findUnique({
      where: { idempotency_key: idempotencyKey },
    });
  }

  private formatIngestResponse(event: {
    id: string;
    event_type: string;
    status: string;
    created_at: Date;
    processed_at: Date | null;
  }) {
    return {
      ingest_event_id: event.id,
      event_type: event.event_type,
      status: event.status,
      received_at: event.created_at.toISOString(),
      processed_at: event.processed_at?.toISOString() ?? null,
    };
  }
}
