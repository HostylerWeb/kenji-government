import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLicenceDto, UpdateLicenceDto } from "./dto/licence.dto";

@Injectable()
export class LicencesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOperatorId(externalId: string) {
    const operator = await this.prisma.client.operators.findUnique({
      where: { external_id: externalId },
      select: { id: true },
    });

    if (!operator) {
      throw new NotFoundException(`Operator ${externalId} not found`);
    }

    return operator.id;
  }

  async listForOperator(externalId: string) {
    const operatorId = await this.getOperatorId(externalId);
    return this.prisma.client.licences.findMany({
      where: { operator_id: operatorId },
      orderBy: { expires_at: "desc" },
    });
  }

  async create(externalId: string, dto: CreateLicenceDto) {
    const operatorId = await this.getOperatorId(externalId);

    const existing = await this.prisma.client.licences.findUnique({
      where: { licence_number: dto.licence_number },
    });

    if (existing) {
      throw new ConflictException(
        `Licence number ${dto.licence_number} already exists`,
      );
    }

    return this.prisma.client.licences.create({
      data: {
        operator_id: operatorId,
        licence_number: dto.licence_number,
        licence_type: dto.licence_type ?? "raffle",
        issued_at: new Date(dto.issued_at),
        expires_at: new Date(dto.expires_at),
        status: dto.status ?? "active",
      },
    });
  }

  async update(externalId: string, licenceId: string, dto: UpdateLicenceDto) {
    const operatorId = await this.getOperatorId(externalId);

    const licence = await this.prisma.client.licences.findFirst({
      where: { id: licenceId, operator_id: operatorId },
    });

    if (!licence) {
      throw new NotFoundException("Licence not found");
    }

    return this.prisma.client.licences.update({
      where: { id: licenceId },
      data: {
        ...dto,
        issued_at: dto.issued_at ? new Date(dto.issued_at) : undefined,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
      },
    });
  }
}
