import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "crypto";
import type { FastifyRequest } from "fastify";
import { PrismaService } from "../../prisma/prisma.service";
import { decryptIngestSecret, signIngestBody } from "../crypto.util";

@Injectable()
export class ApiKeyHmacGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        rawBody?: Buffer;
        ingestSite?: {
          siteId: string;
          operatorId: string;
          operatorExternalId: string;
          credentialId: string;
          apiKeyPrefix: string;
        };
      }
    >();

    const apiKey = this.headerValue(request, "x-api-key");
    const signature = this.headerValue(request, "x-signature");
    const idempotencyKey = this.headerValue(request, "x-idempotency-key");

    if (!apiKey) {
      throw new UnauthorizedException("Missing X-Api-Key header");
    }
    if (!signature) {
      throw new UnauthorizedException("Missing X-Signature header");
    }
    if (!idempotencyKey) {
      throw new UnauthorizedException("Missing X-Idempotency-Key header");
    }

    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
    const credential = await this.prisma.client.api_credentials.findFirst({
      where: {
        api_key_hash: apiKeyHash,
        is_active: true,
      },
      include: {
        operator_site: {
          include: {
            operator: { select: { id: true, external_id: true } },
          },
        },
      },
    });

    if (!credential?.operator_site) {
      throw new UnauthorizedException("Invalid API key");
    }

    if (credential.operator_site.status !== "active") {
      throw new ForbiddenException("Operator site is suspended");
    }

    const allowedIps = credential.allowed_ips as string[] | null;
    if (allowedIps?.length) {
      const clientIp = request.ip;
      if (!allowedIps.includes(clientIp)) {
        throw new ForbiddenException("IP address not allowed");
      }
    }

    if (!credential.hmac_secret_encrypted) {
      throw new UnauthorizedException("Credential missing signing secret");
    }

    const contentType = String(request.headers["content-type"] ?? "");
    const method = request.method?.toUpperCase() ?? "GET";
    let rawBody: Buffer;
    if (
      contentType.includes("multipart/form-data") ||
      method === "GET" ||
      method === "HEAD"
    ) {
      rawBody = Buffer.from("");
    } else {
      const fastifyRaw = (request as { rawBody?: Buffer | string }).rawBody;
      rawBody = fastifyRaw
        ? Buffer.isBuffer(fastifyRaw)
          ? fastifyRaw
          : Buffer.from(fastifyRaw)
        : Buffer.from("");
    }
    const hmacSecret = decryptIngestSecret(credential.hmac_secret_encrypted);
    const expected = signIngestBody(rawBody, hmacSecret);
    const normalized = signature.toLowerCase().replace(/^sha256=/, "");

    if (expected !== normalized) {
      throw new UnauthorizedException("Invalid X-Signature");
    }

    request.ingestSite = {
      siteId: credential.operator_site.id,
      operatorId: credential.operator_site.operator.id,
      operatorExternalId: credential.operator_site.operator.external_id,
      credentialId: credential.id,
      apiKeyPrefix: credential.api_key_prefix,
    };

    request.headers["x-idempotency-key"] = idempotencyKey;

    await this.prisma.client.api_credentials.update({
      where: { id: credential.id },
      data: { last_used_at: new Date() },
    });

    return true;
  }

  private headerValue(request: FastifyRequest, name: string): string | undefined {
    const value = request.headers[name];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  }
}
