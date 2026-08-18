import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RegionalController } from "./regional.controller";
import { RegionalService } from "./regional.service";

@Module({
  imports: [PrismaModule],
  controllers: [RegionalController],
  providers: [RegionalService],
})
export class RegionalModule {}
