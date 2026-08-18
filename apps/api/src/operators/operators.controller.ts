import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OperatorsService } from "./operators.service";
import { CreateOperatorDto, UpdateOperatorDto } from "./dto/operator.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "@kenji-government/shared";
import { OperatorActionDto } from "./dto/operator-action.dto";

@ApiTags("operators")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("operators")
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Get("stats")
  getStats() {
    return this.operatorsService.dashboardStats();
  }

  @Get()
  list(
    @Query("search") search?: string,
    @Query("region") region?: string,
    @Query("compliance_status") compliance_status?: string,
    @Query("status") status?: string,
  ) {
    return this.operatorsService.list({
      search,
      region,
      compliance_status,
      status,
    });
  }

  @Get(":externalId")
  get(@Param("externalId") externalId: string) {
    return this.operatorsService.getByExternalId(externalId);
  }

  @Post()
  @Roles("admin", "supervisor")
  create(@Body() dto: CreateOperatorDto) {
    return this.operatorsService.create(dto);
  }

  @Patch(":externalId")
  @Roles("admin", "supervisor")
  update(@Param("externalId") externalId: string, @Body() dto: UpdateOperatorDto) {
    return this.operatorsService.update(externalId, dto);
  }

  @Post(":externalId/actions/warning")
  @Roles("admin", "supervisor")
  warning(
    @Param("externalId") externalId: string,
    @Body() dto: OperatorActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.operatorsService.issueWarning(externalId, user.id, dto.details);
  }

  @Post(":externalId/actions/suspend")
  @Roles("admin", "supervisor")
  suspend(
    @Param("externalId") externalId: string,
    @Body() dto: OperatorActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.operatorsService.suspend(externalId, user.id, dto.details);
  }
}
