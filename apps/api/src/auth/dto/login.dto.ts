import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "admin@gra.go.ke" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "GraAdmin123!" })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ description: "Client device fingerprint hash" })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  device_fingerprint?: string;

  @ApiPropertyOptional({ description: "Browser user-agent label for trusted devices" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  user_agent_label?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refresh_token!: string;
}
