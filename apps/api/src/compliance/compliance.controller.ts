import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplianceService } from "./compliance.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";

@ApiTags("compliance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("compliance")
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get("overview")
  overview() {
    return this.complianceService.overview();
  }
}
