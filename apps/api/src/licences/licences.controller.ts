import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { LicencesService } from "./licences.service";
import { CreateLicenceDto, UpdateLicenceDto } from "./dto/licence.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("licences")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("operators/:externalId/licences")
export class LicencesController {
  constructor(private readonly licencesService: LicencesService) {}

  @Get()
  list(@Param("externalId") externalId: string) {
    return this.licencesService.listForOperator(externalId);
  }

  @Post()
  @Roles("admin", "supervisor")
  create(
    @Param("externalId") externalId: string,
    @Body() dto: CreateLicenceDto,
  ) {
    return this.licencesService.create(externalId, dto);
  }

  @Patch(":licenceId")
  @Roles("admin", "supervisor")
  update(
    @Param("externalId") externalId: string,
    @Param("licenceId") licenceId: string,
    @Body() dto: UpdateLicenceDto,
  ) {
    return this.licencesService.update(externalId, licenceId, dto);
  }
}
