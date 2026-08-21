import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { IngestService } from "./ingest.service";
import { ApiKeyHmacGuard } from "./guards/api-key-hmac.guard";
import { IngestSite } from "./decorators/ingest-site.decorator";
import type { IngestSiteContext } from "./decorators/ingest-site.decorator";
import { RateLimitService } from "./rate-limit.service";
import { RealtimeEventsService } from "./realtime-events.service";
import { PlayerSafetyEventsService } from "./player-safety-events.service";

@ApiTags("ingest")
@ApiHeader({ name: "X-Api-Key", required: true })
@ApiHeader({ name: "X-Signature", required: true })
@ApiHeader({ name: "X-Idempotency-Key", required: true })
@UseGuards(ApiKeyHmacGuard)
@Controller()
export class IngestController {
  constructor(
    private readonly ingest: IngestService,
    private readonly realtime: RealtimeEventsService,
    private readonly playerSafety: PlayerSafetyEventsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get("status")
  async status(@IngestSite() site: IngestSiteContext) {
    await this.rateLimit.check(site.apiKeyPrefix);
    return this.ingest.getStatus(site);
  }

  @Post("heartbeat")
  async heartbeat(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    return this.ingest.heartbeat(site, body);
  }

  @Post("returns/monthly")
  async monthlyReturn(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    return this.ingest.submitMonthlyReturn(site, body, idempotencyKey);
  }

  @Post("documents")
  async uploadDocument(
    @IngestSite() site: IngestSiteContext,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    const data = await request.file();
    if (!data) {
      throw new BadRequestException("No file uploaded");
    }

    const fields = data.fields as Record<string, { value?: string }>;
    const title = fields.title?.value ?? data.filename;
    const document_type = fields.document_type?.value ?? "other";
    const reporting_year = fields.reporting_year?.value
      ? Number(fields.reporting_year.value)
      : undefined;
    const reporting_month = fields.reporting_month?.value
      ? Number(fields.reporting_month.value)
      : undefined;
    const buffer = await data.toBuffer();

    return this.ingest.uploadDocument(
      site,
      idempotencyKey,
      {
        title,
        document_type,
        reporting_year: Number.isFinite(reporting_year) ? reporting_year : undefined,
        reporting_month: Number.isFinite(reporting_month) ? reporting_month : undefined,
      },
      {
        filename: data.filename,
        mimetype: data.mimetype,
        buffer,
      },
    );
  }

  @Post("events/ticket")
  async ticketEvent(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    return this.realtime.submitTicketEvent(site, body, idempotencyKey);
  }

  @Post("events/payment")
  async paymentEvent(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    return this.realtime.submitPaymentEvent(site, body, idempotencyKey);
  }

  @Post("events/operator-updated")
  async operatorUpdatedEvent(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    return this.realtime.submitOperatorUpdatedEvent(site, body, idempotencyKey);
  }

  @Post("events/player-safety")
  async playerSafetyEvent(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    return this.playerSafety.submitPlayerSafetyEvent(
      site,
      body,
      idempotencyKey,
    );
  }

  @Post("events/session-aggregate")
  async sessionAggregateEvent(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    return this.playerSafety.submitSessionAggregate(
      site,
      body,
      idempotencyKey,
    );
  }

  private getIdempotencyKey(request: FastifyRequest): string {
    const value = request.headers["x-idempotency-key"];
    if (typeof value === "string" && value.length > 0) return value;
    if (Array.isArray(value) && value[0]) return value[0];
    throw new BadRequestException("Missing X-Idempotency-Key header");
  }
}
