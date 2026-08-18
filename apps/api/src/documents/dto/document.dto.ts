import { IsEnum, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UploadDocumentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({
    enum: [
      "trading_licence",
      "registration",
      "tax_certificate",
      "audit_report",
      "insurance",
      "other",
    ],
  })
  @IsEnum([
    "trading_licence",
    "registration",
    "tax_certificate",
    "audit_report",
    "insurance",
    "other",
  ])
  document_type!:
    | "trading_licence"
    | "registration"
    | "tax_certificate"
    | "audit_report"
    | "insurance"
    | "other";
}
