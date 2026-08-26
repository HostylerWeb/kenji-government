import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@kenji-government/shared";
import { IntegrationsService } from "./integrations.service";
import { RejectApplicationDto } from "./dto/operator-application.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("operator-applications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("operator-applications")
export class ApplicationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @Roles("admin", "supervisor")
  list(@Query("status") status?: string) {
    return this.integrations.listApplications(status);
  }

  @Get(":id")
  @Roles("admin", "supervisor")
  get(@Param("id") id: string) {
    return this.integrations.getApplication(id);
  }

  @Post(":id/approve")
  @Roles("admin")
  approve(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.integrations.approveApplication(id, user);
  }

  @Post(":id/reject")
  @Roles("admin")
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.integrations.rejectApplication(id, user, dto.rejection_reason);
  }
}
