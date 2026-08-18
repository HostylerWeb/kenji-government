import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("alerts")
  alerts() {
    return this.dashboardService.alerts();
  }

  @Get("stats")
  stats() {
    return this.dashboardService.extendedStats();
  }
}
