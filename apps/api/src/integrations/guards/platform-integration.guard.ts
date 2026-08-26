import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { verifyPlatformIntegrationSignature } from "@kenji-government/shared";

@Injectable()
export class PlatformIntegrationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { rawBody?: string }
    >();
    const signature = this.headerValue(request, "x-platform-signature");
    const secret = process.env.PLATFORM_GRA_INTEGRATION_SECRET?.trim();
    const rawBody =
      request.rawBody ??
      (typeof request.body === "string"
        ? request.body
        : JSON.stringify(request.body ?? ""));

    if (!verifyPlatformIntegrationSignature(rawBody, signature, secret)) {
      throw new UnauthorizedException("Invalid integration signature");
    }

    return true;
  }

  private headerValue(
    request: FastifyRequest,
    name: string,
  ): string | undefined {
    const value = request.headers[name];
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
  }
}
