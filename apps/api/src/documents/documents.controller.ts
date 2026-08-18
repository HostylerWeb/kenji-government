import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest, FastifyReply } from "fastify";
import { DocumentsService } from "./documents.service";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthUser } from "@kenji-government/shared";

@ApiTags("documents")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("operators/:externalId/documents")
export class OperatorDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@Param("externalId") externalId: string) {
    return this.documentsService.listForOperator(externalId);
  }

  @Post()
  @Roles("admin", "supervisor", "analyst")
  @ApiConsumes("multipart/form-data")
  async upload(
    @Param("externalId") externalId: string,
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthUser,
  ) {
    const data = await request.file();
    if (!data) {
      throw new BadRequestException("No file uploaded");
    }

    const fields = data.fields as Record<string, { value?: string }>;
    const title = fields.title?.value ?? data.filename;
    const document_type = fields.document_type?.value ?? "other";
    const buffer = await data.toBuffer();

    return this.documentsService.upload(
      externalId,
      user.id,
      { title, document_type },
      {
        filename: data.filename,
        mimetype: data.mimetype,
        buffer,
      },
    );
  }
}

@ApiTags("documents")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(":id/download")
  async download(@Param("id") id: string, @Res() reply: FastifyReply) {
    const file = await this.documentsService.getDownload(id);
    reply
      .header("Content-Type", file.mime_type)
      .header(
        "Content-Disposition",
        `attachment; filename="${file.filename}"`,
      )
      .send(file.buffer);
  }
}
