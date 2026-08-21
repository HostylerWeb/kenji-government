import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { AuditModule } from "../audit/audit.module";
import {
  DocumentsController,
  OperatorDocumentsController,
} from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [PrismaModule, StorageModule, AuditModule],
  controllers: [DocumentsController, OperatorDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
