import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { RegionalService } from "./regional.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";

@ApiTags("regional")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("regional")
export class RegionalController {
  constructor(private readonly regional: RegionalService) {}

  @Get("overview")
  overview(@Query("days") days?: string) {
    const parsed = days ? Number(days) : 30;
    return this.regional.getOverview(
      Number.isFinite(parsed) ? parsed : 30,
    );
  }

  @Get("counties/:county")
  countyDetail(@Param("county") county: string, @Query("days") days?: string) {
    const parsed = days ? Number(days) : 30;
    return this.regional.getCountyDetail(
      decodeURIComponent(county),
      Number.isFinite(parsed) ? parsed : 30,
    );
  }

  @Get("export")
  async export(@Query("days") days?: string, @Res() reply?: FastifyReply) {
    const parsed = days ? Number(days) : 30;
    const result = await this.regional.exportAnonymisedDataset(
      Number.isFinite(parsed) ? parsed : 30,
    );

    return reply!
      .header("Content-Type", result.mime_type)
      .header(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      )
      .send(result.buffer);
  }
}
