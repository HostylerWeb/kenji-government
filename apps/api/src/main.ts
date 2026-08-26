import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { Readable } from "stream";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import multipart from "@fastify/multipart";
import { AppModule } from "./app.module";

loadEnv({ path: resolve(__dirname, "../../../.env") });

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

function needsRawBody(url: string): boolean {
  return url.includes("/integrations/v1/");
}

// Prisma returns BigInt for some fields; ensure JSON responses serialize cleanly.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook("preParsing", async (request, _reply, payload) => {
    if (!needsRawBody(String(request.url ?? ""))) {
      return payload;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of payload as AsyncIterable<Buffer | string>) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks);
    request.rawBody = raw.toString("utf8");
    return Readable.from([raw]);
  });

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("GRA Staff API")
    .setDescription("Gambling Regulatory Authority — staff oversight API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`GRA Staff API listening on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
