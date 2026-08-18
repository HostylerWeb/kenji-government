import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { encryptIngestSecret } from "@kenji-government/shared";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.client.users.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        last_login_at: true,
        created_at: true,
      },
      orderBy: { full_name: "asc" },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.client.users.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const password_hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.client.users.create({
      data: {
        email: dto.email,
        password_hash,
        full_name: dto.full_name,
        role: dto.role,
        is_active: true,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.client.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");

    return this.prisma.client.users.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        is_active: true,
        last_login_at: true,
      },
    });
  }

  async listSites(externalId: string) {
    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: externalId },
      include: {
        operator_sites: {
          include: {
            api_credentials: {
              select: {
                id: true,
                api_key_prefix: true,
                is_active: true,
                last_used_at: true,
                created_at: true,
              },
            },
          },
        },
      },
    });
    if (!operator) throw new NotFoundException("Operator not found");
    return operator.operator_sites;
  }

  async generateCredential(siteId: string) {
    const site = await this.prisma.client.operator_sites.findUnique({
      where: { id: siteId },
    });
    if (!site) throw new NotFoundException("Operator site not found");

    const rawKey = `gra_${randomBytes(24).toString("hex")}`;
    const prefix = rawKey.slice(0, 12);
    const api_key_hash = createHash("sha256").update(rawKey).digest("hex");
    const hmac_secret = randomBytes(32).toString("hex");
    const hmac_secret_hash = createHash("sha256").update(hmac_secret).digest("hex");

    const credential = await this.prisma.client.api_credentials.create({
      data: {
        operator_site_id: siteId,
        api_key_hash,
        api_key_prefix: prefix,
        hmac_secret_hash,
        hmac_secret_encrypted: encryptIngestSecret(hmac_secret),
        is_active: true,
      },
    });

    return {
      id: credential.id,
      api_key: rawKey,
      api_key_prefix: prefix,
      hmac_secret,
      message: "Store these credentials securely. They will not be shown again.",
    };
  }

  async revokeCredential(credentialId: string) {
    const cred = await this.prisma.client.api_credentials.findUnique({
      where: { id: credentialId },
    });
    if (!cred) throw new NotFoundException("Credential not found");

    return this.prisma.client.api_credentials.update({
      where: { id: credentialId },
      data: { is_active: false },
    });
  }
}
