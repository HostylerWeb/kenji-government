import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ENFORCEMENT_CASE_NATURES,
  ENFORCEMENT_CASE_PRIORITIES,
  ENFORCEMENT_CASE_TYPES,
} from "@kenji-government/shared";

export class CreateEnforcementCaseDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: ENFORCEMENT_CASE_TYPES })
  @IsEnum(ENFORCEMENT_CASE_TYPES)
  case_type!: (typeof ENFORCEMENT_CASE_TYPES)[number];

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @ApiProperty({ enum: ENFORCEMENT_CASE_NATURES })
  @IsEnum(ENFORCEMENT_CASE_NATURES)
  nature!: (typeof ENFORCEMENT_CASE_NATURES)[number];

  @ApiPropertyOptional({ enum: ENFORCEMENT_CASE_PRIORITIES })
  @IsOptional()
  @IsEnum(ENFORCEMENT_CASE_PRIORITIES)
  priority?: (typeof ENFORCEMENT_CASE_PRIORITIES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requires_operator_response?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_internal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_allegations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  allegations_summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requires_documents?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  required_documents?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_financial_penalty?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fine_amount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fine_due_by?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fine_payment_notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_supporting_evidence?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  supporting_evidence_notes?: string;
}

export class ResolveEnforcementCaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
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
  fine_amount?: number;
}

export class RequestEnforcementDocumentsDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  documents!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  due_by?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
