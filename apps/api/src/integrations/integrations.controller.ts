import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { IntegrationsService } from "./integrations.service";
import { SubmitOperatorApplicationDto } from "./dto/operator-application.dto";
import { TeardownPlatformOperatorDto } from "./dto/teardown-platform-operator.dto";
import { PlatformIntegrationGuard } from "./guards/platform-integration.guard";

@ApiTags("integrations")
@Controller("integrations/v1")
@UseGuards(PlatformIntegrationGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Post("operator-applications")
  submitApplication(
    @Body() dto: SubmitOperatorApplicationDto,
    @Req() _req: FastifyRequest,
  ) {
    return this.integrations.submitApplication(dto);
  }

  @Get("operator-applications/:id/status")
  applicationStatus(@Param("id") id: string) {
    return this.integrations.getApplicationStatus(id);
  }

  @Post("platform-operators/teardown")
  teardownPlatformOperator(
    @Body() dto: TeardownPlatformOperatorDto,
    @Req() _req: FastifyRequest,
  ) {
    return this.integrations.teardownPlatformOperator(dto);
  }
}
