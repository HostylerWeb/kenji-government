import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOperatorSiteDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  domain!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  site_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}
