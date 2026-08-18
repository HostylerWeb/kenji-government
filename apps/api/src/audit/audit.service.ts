import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    user_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    metadata?: Prisma.InputJsonValue;
    ip_address?: string;
  }) {
    await this.prisma.client.audit_logs.create({
      data: {
        user_id: params.user_id ?? null,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id ?? null,
        metadata: params.metadata ?? undefined,
        ip_address: params.ip_address ?? null,
      },
    });
  }

  async list(params: {
    user_id?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const where: Prisma.audit_logsWhereInput = {};

    if (params.user_id) where.user_id = params.user_id;
    if (params.action) {
      where.action = { contains: params.action, mode: "insensitive" };
    }
    if (params.from || params.to) {
      where.created_at = {};
      if (params.from) where.created_at.gte = new Date(params.from);
      if (params.to) where.created_at.lte = new Date(params.to);
    }

    return this.prisma.client.audit_logs.findMany({
      where,
      include: {
        user: { select: { id: true, full_name: true, email: true, role: true } },
      },
      orderBy: { created_at: "desc" },
      take: params.limit ?? 100,
    });
  }

  toCsv(
    logs: Array<{
      created_at: Date;
      action: string;
      entity_type: string;
      entity_id: string | null;
      ip_address: string | null;
      user?: { email?: string; full_name?: string } | null;
    }>,
  ): string {
    const headers = ["timestamp", "user", "action", "entity_type", "entity_id", "ip"];
    const rows = logs.map((log) =>
      [
        log.created_at.toISOString(),
        log.user?.email ?? "",
        log.action,
        log.entity_type,
        log.entity_id ?? "",
        log.ip_address ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }
}
