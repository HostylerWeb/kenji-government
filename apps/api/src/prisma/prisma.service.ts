import { Injectable, OnModuleInit } from "@nestjs/common";
import { prisma } from "@kenji-government/database";

@Injectable()
export class PrismaService implements OnModuleInit {
  readonly client = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }
}
