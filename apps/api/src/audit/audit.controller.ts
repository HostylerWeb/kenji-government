import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { AuditService } from "./audit.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query("user_id") user_id?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string,
  ) {
    return this.auditService.list({
      user_id,
      action,
      from,
      to,
      limit: limit ? Number(limit) : 100,
    });
  }

  @Get("export")
  @Roles("admin", "auditor")
  async export(
    @Res() reply: FastifyReply,
    @Query("user_id") user_id?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const logs = await this.auditService.list({
      user_id,
      action,
      from,
      to,
      limit: 1000,
    });
    const csv = this.auditService.toCsv(logs);
    reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", "attachment; filename=audit-logs.csv")
      .send(csv);
  }
}
