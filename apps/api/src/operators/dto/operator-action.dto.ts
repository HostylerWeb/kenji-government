import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class OperatorActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;
}
