import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthUser } from "@kenji-government/shared";
import { roleMeetsMinimum } from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ReportsQueueService } from "./reports-queue.service";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: ReportsQueueService,
  ) {}

  async listDefinitions(user: AuthUser) {
    const rows = await this.prisma.client.report_definitions.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    return rows
      .filter((row) => roleMeetsMinimum(user.role, row.required_role))
      .map((row) => this.toDefinitionDto(row));
  }

  async listScheduled(user: AuthUser) {
    const rows = await this.prisma.client.report_definitions.findMany({
      where: { is_scheduled: true },
      orderBy: { title: "asc" },
    });

    return rows
      .filter((row) => roleMeetsMinimum(user.role, row.required_role))
      .map((row) => this.toDefinitionDto(row));
  }

  async getDefinition(slug: string, user: AuthUser) {
    const row = await this.prisma.client.report_definitions.findUnique({
      where: { slug },
    });
    if (!row) {
      throw new NotFoundException("Report not found");
    }
    if (!roleMeetsMinimum(user.role, row.required_role)) {
      throw new ForbiddenException("Insufficient role for this report");
    }
    return this.toDefinitionDto(row);
  }

  async runReport(
    slug: string,
    user: AuthUser,
    format: "csv" | "pdf",
    parameters: Record<string, unknown> = {},
  ) {
    const definition = await this.prisma.client.report_definitions.findUnique({
      where: { slug },
    });
    if (!definition) {
      throw new NotFoundException("Report not found");
    }
    if (!roleMeetsMinimum(user.role, definition.required_role)) {
      throw new ForbiddenException("Insufficient role for this report");
    }

    const run = await this.prisma.client.report_runs.create({
      data: {
        report_definition_id: definition.id,
        requested_by: user.id,
        parameters: parameters as Prisma.InputJsonValue,
        format,
        status: "queued",
      },
      include: {
        report_definition: { select: { slug: true, title: true } },
        requester: { select: { full_name: true, email: true } },
      },
    });

    await this.queue.enqueueGenerate(run.id);

    return this.toRunDto(run);
  }

  async listRuns(user: AuthUser, limit = 50) {
    const definitions = await this.listDefinitions(user);
    const allowedIds = new Set(definitions.map((d) => d.id));

    const runs = await this.prisma.client.report_runs.findMany({
      where: { report_definition_id: { in: [...allowedIds] } },
      include: {
        report_definition: {
          select: { slug: true, title: true, category: true },
        },
        requester: { select: { full_name: true, email: true } },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return runs.map((run) => this.toRunDto(run));
  }

  async getRun(runId: string, user: AuthUser) {
    const run = await this.prisma.client.report_runs.findUnique({
      where: { id: runId },
      include: {
        report_definition: true,
        requester: { select: { full_name: true, email: true } },
      },
    });
    if (!run) {
      throw new NotFoundException("Report run not found");
    }
    if (!roleMeetsMinimum(user.role, run.report_definition.required_role)) {
      throw new ForbiddenException("Insufficient role for this report");
    }
    return this.toRunDto(run);
  }

  async getDownload(runId: string, user: AuthUser) {
    const runRecord = await this.prisma.client.report_runs.findUnique({
      where: { id: runId },
      include: {
        report_definition: true,
        requester: { select: { full_name: true, email: true } },
      },
    });
    if (!runRecord) {
      throw new NotFoundException("Report run not found");
    }
    if (!roleMeetsMinimum(user.role, runRecord.report_definition.required_role)) {
      throw new ForbiddenException("Insufficient role for this report");
    }

    const run = this.toRunDto(runRecord);
    if (run.status !== "completed" || !runRecord.file_path) {
      throw new BadRequestException("Report file not ready");
    }

    const signedUrl = await this.storage.getSignedDownloadUrl(runRecord.file_path);
    if (signedUrl) {
      return {
        download_url: signedUrl,
        expires_in_seconds: 3600,
        filename: this.buildFilename(runRecord),
      };
    }

    const buffer = await this.storage.readFile(runRecord.file_path);
    return {
      buffer,
      filename: this.buildFilename(runRecord),
      mime_type: run.format === "pdf" ? "application/pdf" : "text/csv",
    };
  }

  private buildFilename(run: {
    report_definition: { slug: string };
    format: string;
    created_at: Date;
  }) {
    const date = run.created_at.toISOString().slice(0, 10);
    return `${run.report_definition.slug}-${date}.${run.format}`;
  }

  private toDefinitionDto(row: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    category: string;
    required_role: string;
    parameters_schema: unknown;
    is_scheduled: boolean;
    schedule_recipients: unknown;
    schedule_cadence: string | null;
  }) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      category: row.category,
      required_role: row.required_role,
      parameters_schema: row.parameters_schema,
      is_scheduled: row.is_scheduled,
      schedule_recipients: row.schedule_recipients,
      schedule_cadence: row.schedule_cadence,
    };
  }

  private toRunDto(run: {
    id: string;
    report_definition_id: string;
    requested_by: string | null;
    parameters: unknown;
    format: string;
    file_path: string | null;
    status: string;
    error_message: string | null;
    is_scheduled: boolean;
    completed_at: Date | null;
    created_at: Date;
    report_definition: {
      slug: string;
      title: string;
      category?: string;
      required_role?: string;
    };
    requester?: { full_name: string; email: string } | null;
  }) {
    return {
      id: run.id,
      report_definition_id: run.report_definition_id,
      slug: run.report_definition.slug,
      title: run.report_definition.title,
      category: run.report_definition.category,
      parameters: run.parameters,
      format: run.format,
      file_path: run.file_path,
      status: run.status,
      error_message: run.error_message,
      is_scheduled: run.is_scheduled,
      completed_at: run.completed_at?.toISOString() ?? null,
      created_at: run.created_at.toISOString(),
      requested_by: run.requester
        ? {
            full_name: run.requester.full_name,
            email: run.requester.email,
          }
        : null,
    };
  }
}
