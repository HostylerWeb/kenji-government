import { Controller, Get, Query, Sse, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { LiveService } from "./live.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";

@ApiTags("live")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("live")
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Get("activity")
  @ApiQuery({ name: "operator_external_id", required: false })
  @ApiQuery({ name: "limit", required: false })
  getActivity(
    @Query("operator_external_id") operatorExternalId?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 25;
    return this.live.getRecentActivity(
      operatorExternalId,
      Number.isFinite(parsedLimit) ? parsedLimit : 25,
    );
  }

  @Get("counters")
  @ApiQuery({ name: "operator_external_id", required: false })
  getCounters(@Query("operator_external_id") operatorExternalId?: string) {
    return this.live.getCounters(operatorExternalId);
  }

  @Sse("stream")
  @ApiQuery({ name: "operator_external_id", required: false })
  @ApiQuery({ name: "access_token", required: false })
  stream(@Query("operator_external_id") operatorExternalId?: string) {
    return this.live.createEventStream(operatorExternalId);
  }
}
