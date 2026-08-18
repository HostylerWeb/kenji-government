import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@kenji-government/shared";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("system")
  @Roles("admin")
  getSystem(@CurrentUser() user: AuthUser) {
    return this.settings.getPublicSettings(user);
  }

  @Patch("system")
  @Roles("super_admin")
  updateSystem(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.settings.updateSettings(user, body);
  }
}
