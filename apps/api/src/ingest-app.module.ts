import { Module } from "@nestjs/common";
import { StorageModule } from "./storage/storage.module";
import { IngestModule } from "./ingest/ingest.module";

@Module({
  imports: [StorageModule, IngestModule],
})
export class IngestAppModule {}
