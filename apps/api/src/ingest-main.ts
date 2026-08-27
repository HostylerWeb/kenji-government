import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import multipart from "@fastify/multipart";
import { IngestAppModule } from "./ingest-app.module";

loadEnv({ path: resolve(__dirname, "../../../.env"), override: true });

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    IngestAppModule,
    new FastifyAdapter({ logger: true }),
    { rawBody: true },
  );

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.setGlobalPrefix("v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("GRA Operator Ingest API")
    .setDescription(
      "Operator data ingest and sandbox mock payment gateway (Harambe Pay stand-in)",
    )
    .setVersion("1.0.0")
    .addApiKey({ type: "apiKey", name: "X-Api-Key", in: "header" }, "api-key")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.INGEST_PORT ?? 4001);
  await app.listen(port, "0.0.0.0");
  console.log(`GRA Ingest API listening on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
