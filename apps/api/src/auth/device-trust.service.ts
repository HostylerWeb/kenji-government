import { createHash } from "crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DeviceTrustService {
  constructor(private readonly prisma: PrismaService) {}

  hashFingerprint(fingerprint: string): string {
    return createHash("sha256").update(fingerprint).digest("hex");
  }

  async isDeviceTrusted(userId: string, fingerprintHash: string): Promise<boolean> {
    const row = await this.prisma.client.user_trusted_devices.findUnique({
      where: {
        user_id_fingerprint_hash: {
          user_id: userId,
          fingerprint_hash: fingerprintHash,
        },
      },
    });
    return Boolean(row);
  }

  async trustDevice(
    userId: string,
    fingerprintHash: string,
    userAgentLabel?: string,
  ) {
    await this.prisma.client.user_trusted_devices.upsert({
      where: {
        user_id_fingerprint_hash: {
          user_id: userId,
          fingerprint_hash: fingerprintHash,
        },
      },
      create: {
        user_id: userId,
        fingerprint_hash: fingerprintHash,
        user_agent_label: userAgentLabel,
        last_seen_at: new Date(),
      },
      update: {
        user_agent_label: userAgentLabel ?? undefined,
        last_seen_at: new Date(),
      },
    });
  }
}
