import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { EnforcementService } from "./enforcement.service";
import {
  CreateEnforcementCaseDto,
  CreateEnforcementActionDto,
  ResolveEnforcementCaseDto,
  RequestEnforcementDocumentsDto,
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
    @Query("bucket") bucket?: "open" | "resolved",
    @Query("operator_external_id") operator_external_id?: string,
  ) {
    return this.enforcementService.listCases({
      status,
      bucket,
      operator_external_id,
    });
  }

  @Get("warnings/list")
  listWarnings(@Query("operator_external_id") operator_external_id?: string) {
    return this.enforcementService.listWarnings({ operator_external_id });
  }

  @Get(":caseId")
  get(@Param("caseId") caseId: string) {
    return this.enforcementService.getCase(caseId);
  }

  @Patch(":caseId/resolve")
  @Roles("admin", "super_admin", "supervisor")
  resolve(
    @Param("caseId") caseId: string,
    @Body() dto: ResolveEnforcementCaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enforcementService.resolveCase(caseId, user.id, dto.notes);
  }

  @Delete(":caseId")
  @Roles("admin", "super_admin", "supervisor")
  delete(@Param("caseId") caseId: string, @CurrentUser() user: AuthUser) {
    return this.enforcementService.deleteCase(caseId, user.id);
  }

  @Post(":caseId/actions")
  @Roles("admin", "super_admin", "supervisor")
  addAction(
    @Param("caseId") caseId: string,
    @Body() dto: CreateEnforcementActionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enforcementService.addAction(caseId, user.id, dto);
  }

  @Post(":caseId/request-documents")
  @Roles("admin", "super_admin", "supervisor")
  requestDocuments(
    @Param("caseId") caseId: string,
    @Body() dto: RequestEnforcementDocumentsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enforcementService.requestDocuments(caseId, user.id, dto);
  }
}

@ApiTags("enforcement")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("operators/:externalId/enforcement")
export class OperatorEnforcementController {
  constructor(private readonly enforcementService: EnforcementService) {}

  @Get("warnings")
  listWarnings(@Param("externalId") externalId: string) {
    return this.enforcementService.listWarnings({
      operator_external_id: externalId,
    });
  }

  @Get()
  list(@Param("externalId") externalId: string) {
    return this.enforcementService.listForOperator(externalId);
  }

  @Post()
  @Roles("admin", "super_admin", "supervisor")
  create(
    @Param("externalId") externalId: string,
    @Body() dto: CreateEnforcementCaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enforcementService.createCase(externalId, user.id, dto);
  }
}
