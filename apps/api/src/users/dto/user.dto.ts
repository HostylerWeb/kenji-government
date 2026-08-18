import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  full_name!: string;

  @ApiProperty({ enum: ["admin", "supervisor", "analyst", "auditor"] })
  @IsEnum(["admin", "supervisor", "analyst", "auditor"])
  role!: "admin" | "supervisor" | "analyst" | "auditor";
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ enum: ["admin", "supervisor", "analyst", "auditor"] })
  @IsOptional()
  @IsEnum(["admin", "supervisor", "analyst", "auditor"])
  role?: "admin" | "supervisor" | "analyst" | "auditor";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
