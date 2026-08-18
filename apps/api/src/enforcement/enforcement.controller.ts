import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { EnforcementService } from "./enforcement.service";
import {
  CreateEnforcementCaseDto,
  CreateEnforcementActionDto,
} from "./dto/enforcement.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "@kenji-government/shared";

@ApiTags("enforcement")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("enforcement/cases")
export class EnforcementController {
  constructor(private readonly enforcementService: EnforcementService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("operator_external_id") operator_external_id?: string,
  ) {
    return this.enforcementService.listCases({
      status,
      operator_external_id,
    });
  }

  @Get(":caseId")
  get(@Param("caseId") caseId: string) {
    return this.enforcementService.getCase(caseId);
  }

  @Post(":caseId/actions")
  @Roles("admin", "supervisor")
  addAction(
    @Param("caseId") caseId: string,
    @Body() dto: CreateEnforcementActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enforcementService.addAction(caseId, user.id, dto);
  }
}

@ApiTags("enforcement")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("operators/:externalId/enforcement")
export class OperatorEnforcementController {
  constructor(private readonly enforcementService: EnforcementService) {}

  @Get()
  list(@Param("externalId") externalId: string) {
    return this.enforcementService.listForOperator(externalId);
  }

  @Post()
  @Roles("admin", "supervisor")
  create(
    @Param("externalId") externalId: string,
    @Body() dto: CreateEnforcementCaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enforcementService.createCase(externalId, user.id, dto);
  }
}
