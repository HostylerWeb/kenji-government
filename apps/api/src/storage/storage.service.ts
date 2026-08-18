import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { join } from "path";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadRoot =
    process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");
  private readonly useMinio = Boolean(process.env.MINIO_ENDPOINT);
  private readonly bucket = process.env.MINIO_BUCKET ?? "kenji-government";
  private readonly s3?: S3Client;

  constructor() {
    if (this.useMinio) {
      const endpoint = process.env.MINIO_USE_SSL === "true"
        ? `https://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT ?? 9000}`
        : `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT ?? 9000}`;

      this.s3 = new S3Client({
        endpoint,
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
          secretAccessKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
        },
        forcePathStyle: true,
      });
      this.logger.log(`MinIO storage enabled at ${endpoint}`);
    } else {
      this.logger.log(`Local file storage at ${this.uploadRoot}`);
    }
  }

  async onModuleInit() {
    if (this.useMinio && this.s3) {
      await this.ensureBucket();
    }
  }

  private async ensureBucket() {
    if (!this.s3) return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Created MinIO bucket: ${this.bucket}`);
    }
  }

  async saveFile(relativePath: string, buffer: Buffer): Promise<string> {
    if (this.useMinio && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: relativePath,
          Body: buffer,
        }),
      );
      return relativePath;
    }

    const fullPath = join(this.uploadRoot, relativePath);
    const dir = join(fullPath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, buffer);
    return relativePath;
  }

  async readFile(relativePath: string): Promise<Buffer> {
    if (this.useMinio && this.s3) {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: relativePath,
        }),
      );
      const bytes = await response.Body?.transformToByteArray();
      if (!bytes) {
        throw new InternalServerErrorException("Empty file from storage");
      }
      return Buffer.from(bytes);
    }

    const fullPath = join(this.uploadRoot, relativePath);
    if (!existsSync(fullPath)) {
      throw new InternalServerErrorException("File not found");
    }
    return readFile(fullPath);
  }
}
