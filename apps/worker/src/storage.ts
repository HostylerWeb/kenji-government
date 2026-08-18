import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

loadEnv({ path: resolve(__dirname, "../../../.env") });

const uploadRoot = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");
const useMinio = Boolean(process.env.MINIO_ENDPOINT);
const bucket = process.env.MINIO_BUCKET ?? "kenji-government";

let s3: S3Client | undefined;

if (useMinio) {
  const endpoint =
    process.env.MINIO_USE_SSL === "true"
      ? `https://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT ?? 9000}`
      : `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT ?? 9000}`;

  s3 = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    },
    forcePathStyle: true,
  });
}

async function ensureBucket() {
  if (!s3) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function saveReportFile(
  relativePath: string,
  buffer: Buffer,
): Promise<string> {
  if (useMinio && s3) {
    await ensureBucket();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: relativePath,
        Body: buffer,
      }),
    );
    return relativePath;
  }

  const fullPath = join(uploadRoot, relativePath);
  const dir = join(fullPath, "..");
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(fullPath, buffer);
  return relativePath;
}
