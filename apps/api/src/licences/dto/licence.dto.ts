import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateLicenceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  licence_number!: string;

  @ApiPropertyOptional({ enum: ["raffle", "competition", "mixed"] })
  @IsOptional()
  @IsEnum(["raffle", "competition", "mixed"])
  licence_type?: "raffle" | "competition" | "mixed";

  @ApiProperty()
  @IsDateString()
  issued_at!: string;

  @ApiProperty()
  @IsDateString()
  expires_at!: string;

  @ApiPropertyOptional({ enum: ["active", "expired", "suspended", "revoked"] })
  @IsOptional()
  @IsEnum(["active", "expired", "suspended", "revoked"])
  status?: "active" | "expired" | "suspended" | "revoked";
}

export class UpdateLicenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licence_number?: string;

  @ApiPropertyOptional({ enum: ["raffle", "competition", "mixed"] })
  @IsOptional()
  @IsEnum(["raffle", "competition", "mixed"])
  licence_type?: "raffle" | "competition" | "mixed";

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issued_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({ enum: ["active", "expired", "suspended", "revoked"] })
  @IsOptional()
  @IsEnum(["active", "expired", "suspended", "revoked"])
  status?: "active" | "expired" | "suspended" | "revoked";
}
