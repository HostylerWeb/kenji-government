import { Module } from "@nestjs/common";
import { StorageModule } from "./storage/storage.module";
import { IngestModule } from "./ingest/ingest.module";
import { GatewayIngestModule } from "./gateway-ingest/gateway-ingest.module";

@Module({
  imports: [StorageModule, IngestModule, GatewayIngestModule],
})
export class IngestAppModule {}
