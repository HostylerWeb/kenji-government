import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOperatorDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  external_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  legal_name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  trading_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registration_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficial_owner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kra_pin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ enum: ["active", "suspended", "revoked", "pending"] })
  @IsOptional()
  @IsEnum(["active", "suspended", "revoked", "pending"])
  status?: "active" | "suspended" | "revoked" | "pending";

  @ApiPropertyOptional({ enum: ["compliant", "at_risk", "non_compliant"] })
  @IsOptional()
  @IsEnum(["compliant", "at_risk", "non_compliant"])
  compliance_status?: "compliant" | "at_risk" | "non_compliant";
}

export class UpdateOperatorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  external_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legal_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trading_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registration_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficial_owner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kra_pin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  county?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ enum: ["active", "suspended", "revoked", "pending"] })
  @IsOptional()
  @IsEnum(["active", "suspended", "revoked", "pending"])
  status?: "active" | "suspended" | "revoked" | "pending";

  @ApiPropertyOptional({ enum: ["compliant", "at_risk", "non_compliant"] })
  @IsOptional()
  @IsEnum(["compliant", "at_risk", "non_compliant"])
  compliance_status?: "compliant" | "at_risk" | "non_compliant";
}
