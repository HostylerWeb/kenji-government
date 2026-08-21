import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";

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

  @Get("charts")
  charts() {
    return this.dashboardService.charts();
  }

  @Get("nav-badges")
  navBadges() {
    return this.dashboardService.navBadges();
  }

  @Get("performance")
  @Roles("super_admin", "admin", "supervisor", "analyst")
  performance(
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.dashboardService.performanceMetrics(from, to);
  }
}
