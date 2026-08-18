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
import { UsersService } from "./users.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";

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
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @Roles("admin")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
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
