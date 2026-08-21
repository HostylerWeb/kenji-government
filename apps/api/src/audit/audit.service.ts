import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  categorizeAuditAction,
  isNoiseAuditAction,
  type AuditCategory,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";

const AUTH_ACTIONS = [
  "login",
  "logout",
  "profile_updated",
  "profile_password_changed",
];

function buildAuditWhere(params: {
  user_id?: string;
  action?: string;
  category?: AuditCategory;
  from?: string;
  to?: string;
}): Prisma.audit_logsWhereInput {
  const conditions: Prisma.audit_logsWhereInput[] = [
    {
      NOT: {
        OR: [
          { action: { startsWith: "GET " } },
          { action: { startsWith: "POST " } },
          { action: { startsWith: "PUT " } },
          { action: { startsWith: "PATCH " } },
          { action: { startsWith: "DELETE " } },
        ],
      },
    },
  ];

  if (params.category === "auth") {
    conditions.push({
      OR: [
        { metadata: { path: ["category"], equals: "auth" } },
        { action: { in: AUTH_ACTIONS } },
        { action: { startsWith: "mfa_" } },
        { action: { startsWith: "device_" } },
        { action: { startsWith: "email_otp_" } },
      ],
    });
  } else if (params.category === "platform") {
    conditions.push({
      OR: [
        { metadata: { path: ["category"], equals: "platform" } },
        {
          AND: [
            {
              NOT: {
                metadata: { path: ["category"], equals: "auth" },
              },
            },
            { action: { notIn: AUTH_ACTIONS } },
            { NOT: { action: { startsWith: "mfa_" } } },
            { NOT: { action: { startsWith: "device_" } } },
            { NOT: { action: { startsWith: "email_otp_" } } },
          ],
        },
      ],
    });
  }

  if (params.user_id) {
    conditions.push({ user_id: params.user_id });
  }

  if (params.action?.trim()) {
    const term = params.action.trim();
    conditions.push({
      OR: [
        { action: { contains: term, mode: "insensitive" } },
        {
          metadata: {
            path: ["summary"],
            string_contains: term,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (params.from || params.to) {
    const created_at: Prisma.DateTimeFilter = {};
    if (params.from) created_at.gte = new Date(params.from);
    if (params.to) {
      const end = new Date(params.to);
      end.setHours(23, 59, 59, 999);
      created_at.lte = end;
    }
    conditions.push({ created_at });
  }

  return { AND: conditions };
}

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
    category?: AuditCategory;
  }) {
    const metadata =
      typeof params.metadata === "object" && params.metadata !== null
        ? {
            ...(params.metadata as Record<string, unknown>),
            category:
              params.category ??
              (params.metadata as Record<string, unknown>).category ??
              categorizeAuditAction(params.action, params.metadata),
          }
        : {
            category: params.category ?? categorizeAuditAction(params.action),
          };

    await this.prisma.client.audit_logs.create({
      data: {
        user_id: params.user_id ?? null,
        action: params.action,
        entity_type: params.entity_type,
        entity_id: params.entity_id ?? null,
        metadata: metadata as Prisma.InputJsonValue,
        ip_address: params.ip_address ?? null,
      },
    });
  }

  async listPaginated(params: {
    user_id?: string;
    action?: string;
    category?: AuditCategory;
    from?: string;
    to?: string;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.page_size ?? 50));
    const where = buildAuditWhere(params);

    const [total, items] = await Promise.all([
      this.prisma.client.audit_logs.count({ where }),
      this.prisma.client.audit_logs.findMany({
        where,
        include: {
          user: {
            select: { id: true, full_name: true, email: true, role: true },
          },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const filtered = items.filter(
      (log) => !isNoiseAuditAction(log.action),
    );

    return {
      items: filtered,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async list(params: {
    user_id?: string;
    action?: string;
    category?: AuditCategory;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const where = buildAuditWhere(params);
    const logs = await this.prisma.client.audit_logs.findMany({
      where,
      include: {
        user: { select: { id: true, full_name: true, email: true, role: true } },
      },
      orderBy: { created_at: "desc" },
      take: params.limit ?? 1000,
    });

    return logs.filter((log) => !isNoiseAuditAction(log.action));
  }

  async wipeAll(performerId: string) {
    const deleted = await this.prisma.client.audit_logs.deleteMany({});

    await this.log({
      user_id: performerId,
      action: "audit_log_wiped",
      entity_type: "audit_logs",
      category: "platform",
      metadata: {
        summary: `Cleared ${deleted.count} audit log entries`,
        deleted_count: deleted.count,
      },
    });

    return { deleted_count: deleted.count };
  }

  toCsv(
    logs: Array<{
      created_at: Date;
      action: string;
      entity_type: string;
      entity_id: string | null;
      ip_address: string | null;
      metadata?: unknown;
      user?: { email?: string; full_name?: string } | null;
    }>,
  ): string {
    const headers = [
      "timestamp",
      "user",
      "action",
      "entity_type",
      "entity_id",
      "ip",
      "summary",
    ];
    const rows = logs.map((log) => {
      const metadata =
        log.metadata && typeof log.metadata === "object"
          ? (log.metadata as Record<string, unknown>)
          : null;
      const summary =
        typeof metadata?.summary === "string"
          ? metadata.summary
          : JSON.stringify(metadata ?? {});

      return [
        log.created_at.toISOString(),
        log.user?.email ?? "",
        log.action,
        log.entity_type,
        log.entity_id ?? "",
        log.ip_address ?? "",
        summary,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  }
}
