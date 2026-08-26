import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubmitOperatorApplicationDto {
  @ApiProperty()
  @IsUUID()
  platform_operator_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  proposed_external_id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  staging_hostname!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  callback_url!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  legal_name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  trading_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registration_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kra_pin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficial_owner?: string;

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
  @IsUrl({ require_tld: false })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licence_number?: string;
}

export class RejectApplicationDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  rejection_reason!: string;
}
