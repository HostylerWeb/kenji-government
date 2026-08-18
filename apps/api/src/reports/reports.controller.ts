import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { ReportsService } from "./reports.service";
import { RunReportDto } from "./dto/run-report.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "@kenji-government/shared";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.reports.listDefinitions(user);
  }

  @Get("scheduled")
  listScheduled(@CurrentUser() user: AuthUser) {
    return this.reports.listScheduled(user);
  }

  @Get("runs")
  listRuns(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    const parsed = limit ? Number(limit) : 50;
    return this.reports.listRuns(
      user,
      Number.isFinite(parsed) ? parsed : 50,
    );
  }

  @Get("runs/:id")
  getRun(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.reports.getRun(id, user);
  }

  @Get("runs/:id/download")
  async download(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Res() reply: FastifyReply,
  ) {
    const result = await this.reports.getDownload(id, user);

    if ("download_url" in result && result.download_url) {
      return reply.send({
        download_url: result.download_url,
        expires_in_seconds: result.expires_in_seconds,
        filename: result.filename,
      });
    }

    if ("buffer" in result && result.buffer) {
      return reply
        .header("Content-Type", result.mime_type ?? "application/octet-stream")
        .header(
          "Content-Disposition",
          `attachment; filename="${result.filename}"`,
        )
        .send(result.buffer);
    }

    return reply.status(404).send({ message: "File not found" });
  }

  @Get(":slug")
  getDefinition(@Param("slug") slug: string, @CurrentUser() user: AuthUser) {
    return this.reports.getDefinition(slug, user);
  }

  @Post(":slug/run")
  run(
    @Param("slug") slug: string,
    @Body() body: RunReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reports.runReport(
      slug,
      user,
      body.format,
      body.parameters ?? {},
    );
  }
}
