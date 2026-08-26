import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class TeardownPlatformOperatorDto {
  @IsUUID()
  platform_operator_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  gra_registry_id?: string;
}
