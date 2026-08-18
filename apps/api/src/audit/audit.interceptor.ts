import { Prisma } from "@prisma/client";
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "./audit.service";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;

    if (!MUTATING_METHODS.has(method)) {
      return next.handle();
    }

    const path = request.url as string;
    if (path.startsWith("/auth/login")) {
      return next.handle();
    }

    const user = request.user as { id?: string } | undefined;

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const entityId =
            (responseBody as { id?: string })?.id ??
            (request.params?.id as string | undefined);

          await this.auditService.log({
            user_id: user?.id,
            action: `${method} ${path}`,
            entity_type: this.entityTypeFromPath(path),
            entity_id: entityId,
            metadata: {
              body: request.body,
              params: request.params,
            } as Prisma.InputJsonValue,
            ip_address: request.ip,
          });
        } catch {
          // Audit failures should not break the request
        }
      }),
    );
  }

  private entityTypeFromPath(path: string): string {
    const segments = path.split("/").filter(Boolean);
    return segments[0] ?? "unknown";
  }
}
