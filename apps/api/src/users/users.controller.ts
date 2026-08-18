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
import type { AuthUser } from "@kenji-government/shared";
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles("admin")
  list() {
    return this.usersService.list();
  }

  @Post()
  @Roles("admin")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }

  @Patch(":id")
  @Roles("admin")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(user, id, dto);
  }
}

@ApiTags("operator-sites")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OperatorSitesController {
  constructor(private readonly usersService: UsersService) {}

  @Get("operators/:externalId/sites")
  @Roles("admin", "supervisor")
  listSites(@Param("externalId") externalId: string) {
    return this.usersService.listSites(externalId);
  }

  @Post("operator-sites/:siteId/credentials")
  @Roles("admin")
  generateCredential(@Param("siteId") siteId: string) {
    return this.usersService.generateCredential(siteId);
  }

  @Post("operator-sites/:siteId/credentials/:credentialId/revoke")
  @Roles("admin")
  revokeCredential(@Param("credentialId") credentialId: string) {
    return this.usersService.revokeCredential(credentialId);
  }
}
