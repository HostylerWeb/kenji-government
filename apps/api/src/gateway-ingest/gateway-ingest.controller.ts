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
import { GatewayPaymentService } from "../ingest/gateway-payment.service";
import { ApiKeyHmacGuard } from "../ingest/guards/api-key-hmac.guard";
import { IngestSite } from "../ingest/decorators/ingest-site.decorator";
import type { IngestSiteContext } from "../ingest/decorators/ingest-site.decorator";
import { RateLimitService } from "../ingest/rate-limit.service";

/**
 * Endpoints for the **payment gateway service** (separate project).
 * Raffle sites charge via the gateway; the gateway notifies GRA here.
 * Operator sites do not call these routes for card processing.
 */
@ApiTags("gateway-integration")
@ApiHeader({ name: "X-Api-Key", required: true })
@ApiHeader({ name: "X-Signature", required: true })
@ApiHeader({ name: "X-Idempotency-Key", required: true })
@UseGuards(ApiKeyHmacGuard)
@Controller("gateway")
export class GatewayIngestController {
  constructor(
    private readonly gatewayPayment: GatewayPaymentService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get("health")
  health(@IngestSite() site: IngestSiteContext) {
    return {
      service: "gra-government-ingest",
      role: "oversight_receiver",
      operator_external_id: site.operatorExternalId,
      accepts: "POST /v1/gateway/notify",
      message:
        "Payment gateway reports completed or failed ticket payments here.",
    };
  }

  @Post("notify")
  async notify(
    @IngestSite() site: IngestSiteContext,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    await this.rateLimit.check(site.apiKeyPrefix);
    const idempotencyKey = this.getIdempotencyKey(request);
    return this.gatewayPayment.submitGatewayPayment(
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
