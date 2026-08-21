import {
  Controller,
  Delete,
  Get,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import type { AuthUser } from "@kenji-government/shared";
import { AuditService } from "./audit.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

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
    @Query("category") category?: "auth" | "platform",
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("page_size") page_size?: string,
  ) {
    return this.auditService.listPaginated({
      user_id,
      action,
      category,
      from,
      to,
      page: page ? Number(page) : 1,
      page_size: page_size ? Number(page_size) : 50,
    });
  }

  @Get("export")
  @Roles("admin", "super_admin", "auditor")
  async export(
    @Res() reply: FastifyReply,
    @Query("user_id") user_id?: string,
    @Query("action") action?: string,
    @Query("category") category?: "auth" | "platform",
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const logs = await this.auditService.list({
      user_id,
      action,
      category,
      from,
      to,
      limit: 10000,
    });
    const csv = this.auditService.toCsv(logs);
    reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", "attachment; filename=audit-logs.csv")
      .send(csv);
  }

  @Delete()
  @Roles("super_admin")
  wipe(@CurrentUser() user: AuthUser) {
    return this.auditService.wipeAll(user.id);
  }
}
