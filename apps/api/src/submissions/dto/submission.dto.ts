import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReviewSubmissionDto {
  @ApiProperty({ enum: ["approved", "rejected", "revision_requested"] })
  @IsEnum(["approved", "rejected", "revision_requested"])
  status!: "approved" | "rejected" | "revision_requested";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
