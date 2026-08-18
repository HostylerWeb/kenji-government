import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.client.$queryRaw`SELECT 1`;
    return {
      status: "ok",
      service: "gra-staff-api",
      timestamp: new Date().toISOString(),
    };
  }
}
