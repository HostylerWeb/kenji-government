import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateEnforcementCaseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ["warning", "fine", "investigation", "suspension"] })
  @IsEnum(["warning", "fine", "investigation", "suspension"])
  case_type!: "warning" | "fine" | "investigation" | "suspension";
}

export class CreateEnforcementActionDto {
  @ApiProperty({
    enum: ["notice", "warning", "fine", "suspension", "revocation"],
  })
  @IsEnum(["notice", "warning", "fine", "suspension", "revocation"])
  action_type!: "notice" | "warning" | "fine" | "suspension" | "revocation";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fine_amount?: number;
}
