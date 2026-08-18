import { IsIn, IsObject, IsOptional } from "class-validator";

export class RunReportDto {
  @IsIn(["csv", "pdf"])
  format!: "csv" | "pdf";

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
