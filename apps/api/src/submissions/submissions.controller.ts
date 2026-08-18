import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { SubmissionsService } from "./submissions.service";
import { ReviewSubmissionDto } from "./dto/submission.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "@kenji-government/shared";

@ApiTags("submissions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("submissions")
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("operator_external_id") operator_external_id?: string,
    @Query("reporting_period_id") reporting_period_id?: string,
  ) {
    return this.submissionsService.list({
      status,
      operator_external_id,
      reporting_period_id,
    });
  }

  @Get("export")
  async exportCsv(
    @Res() reply: FastifyReply,
    @Query("status") status?: string,
  ) {
    const submissions = await this.submissionsService.list({ status });
    const csv = this.submissionsService.toCsv(
      submissions as Array<Record<string, unknown>>,
    );
    reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", "attachment; filename=submissions.csv")
      .send(csv);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.submissionsService.getById(id);
  }

  @Patch(":id/review")
  @Roles("admin", "supervisor")
  review(
    @Param("id") id: string,
    @Body() dto: ReviewSubmissionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.submissionsService.review(id, user.id, dto.status, dto.notes);
  }
}

@ApiTags("submissions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("operators/:externalId/submissions")
export class OperatorSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  list(@Param("externalId") externalId: string) {
    return this.submissionsService.listForOperator(externalId);
  }

  @Get("export")
  async exportCsv(
    @Param("externalId") externalId: string,
    @Res() reply: FastifyReply,
  ) {
    const submissions = await this.submissionsService.listForOperator(externalId);
    const csv = this.submissionsService.toCsv(
      submissions as Array<Record<string, unknown>>,
    );
    reply
      .header("Content-Type", "text/csv")
      .header(
        "Content-Disposition",
        `attachment; filename=${externalId}-submissions.csv`,
      )
      .send(csv);
  }
}
