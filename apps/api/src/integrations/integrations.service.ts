import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthUser } from "@kenji-government/shared";
import {
  signPlatformIntegrationBody,
  type GraApplicationRejectedPayload,
  type GraCredentialsCallbackPayload,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { SubmitOperatorApplicationDto } from "./dto/operator-application.dto";
import type { TeardownPlatformOperatorDto } from "./dto/teardown-platform-operator.dto";
import { UsersService } from "../users/users.service";

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly usersService: UsersService,
  ) {}

  async submitApplication(dto: SubmitOperatorApplicationDto) {
    const existing = await this.prisma.client.operator_applications.findUnique({
      where: { platform_operator_id: dto.platform_operator_id },
    });

    if (existing) {
      if (
        existing.status === "submitted" ||
        existing.status === "under_review" ||
        existing.status === "approved"
      ) {
        return {
          application_id: existing.id,
          status: existing.status,
          duplicate: true,
        };
      }

      const updated = await this.prisma.client.operator_applications.update({
        where: { id: existing.id },
        data: this.applicationData(dto),
      });

      return {
        application_id: updated.id,
        status: updated.status,
        duplicate: false,
      };
    }

    const created = await this.prisma.client.operator_applications.create({
      data: this.applicationData(dto),
    });

    return {
      application_id: created.id,
      status: created.status,
      duplicate: false,
    };
  }

  async getApplicationStatus(id: string) {
    const application =
      await this.prisma.client.operator_applications.findUnique({
        where: { id },
      });
    if (!application) throw new NotFoundException("Application not found");

    return {
      application_id: application.id,
      status: application.status,
      rejection_reason: application.rejection_reason,
      created_operator_id: application.created_operator_id,
    };
  }

  async listApplications(status?: string) {
    const where =
      status && status !== "all"
        ? {
            status: status as
              | "submitted"
              | "under_review"
              | "approved"
              | "rejected",
          }
        : undefined;

    return this.prisma.client.operator_applications.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        reviewed_by: { select: { id: true, full_name: true, email: true } },
        created_operator: { select: { id: true, external_id: true } },
      },
    });
  }

  async getApplication(id: string) {
    const application =
      await this.prisma.client.operator_applications.findUnique({
        where: { id },
        include: {
          reviewed_by: { select: { id: true, full_name: true, email: true } },
          created_operator: {
            select: {
              id: true,
              external_id: true,
              operator_sites: true,
            },
          },
        },
      });
    if (!application) throw new NotFoundException("Application not found");
    return application;
  }

  async approveApplication(id: string, reviewer: AuthUser) {
    const application =
      await this.prisma.client.operator_applications.findUnique({
        where: { id },
      });
    if (!application) throw new NotFoundException("Application not found");

    if (application.status === "approved" && application.created_operator_id) {
      return this.getApplication(id);
    }

    if (application.status === "rejected") {
      throw new BadRequestException("Rejected applications cannot be approved");
    }

    const externalTaken = await this.prisma.client.operators.findUnique({
      where: { external_id: application.proposed_external_id },
    });
    if (externalTaken) {
      throw new ConflictException(
        `Operator external_id ${application.proposed_external_id} already exists`,
      );
    }

    const usersService = this.usersService;

    const result = await this.prisma.client.$transaction(async (tx) => {
      const operator = await tx.operators.create({
        data: {
          external_id: application.proposed_external_id,
          legal_name: application.legal_name,
          trading_name: application.trading_name,
          registration_number: application.registration_number,
          kra_pin: application.kra_pin,
          beneficial_owner: application.beneficial_owner,
          email: application.email,
          phone: application.phone,
          county: application.county,
          region: application.region,
          website: application.website,
          status: "active",
          compliance_status: "compliant",
        },
      });

      const site = await tx.operator_sites.create({
        data: {
          operator_id: operator.id,
          domain: application.staging_hostname,
          site_name: application.trading_name,
          is_primary: true,
          status: "active",
        },
      });

      if (application.licence_number) {
        const issued = new Date();
        const expires = new Date(issued);
        expires.setFullYear(expires.getFullYear() + 1);
        await tx.licences.create({
          data: {
            operator_id: operator.id,
            licence_number: application.licence_number,
            licence_type: "raffle",
            issued_at: issued,
            expires_at: expires,
            status: "active",
          },
        });
      }

      const credentials = await usersService.generateCredential(site.id, tx);

      await tx.operator_applications.update({
        where: { id: application.id },
        data: {
          status: "approved",
          reviewed_by_id: reviewer.id,
          reviewed_at: new Date(),
          created_operator_id: operator.id,
        },
      });

      return { operator, site, credentials };
    });

    await this.deliverCredentialsToKenji(application, result.credentials);

    await this.audit.log({
      user_id: reviewer.id,
      action: "operator_application.approved",
      entity_type: "operator_applications",
      entity_id: application.id,
      metadata: {
        platform_operator_id: application.platform_operator_id,
        gra_registry_id: application.proposed_external_id,
      },
    });

    return this.getApplication(id);
  }

  async rejectApplication(
    id: string,
    reviewer: AuthUser,
    rejectionReason: string,
  ) {
    const application =
      await this.prisma.client.operator_applications.findUnique({
        where: { id },
      });
    if (!application) throw new NotFoundException("Application not found");

    if (application.status === "approved") {
      throw new BadRequestException("Approved applications cannot be rejected");
    }

    if (application.status === "rejected") {
      return this.getApplication(id);
    }

    await this.prisma.client.operator_applications.update({
      where: { id },
      data: {
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
        reviewed_by_id: reviewer.id,
        reviewed_at: new Date(),
      },
    });

    await this.notifyKenjiRejection(application, rejectionReason.trim());

    await this.audit.log({
      user_id: reviewer.id,
      action: "operator_application.rejected",
      entity_type: "operator_applications",
      entity_id: application.id,
      metadata: {
        platform_operator_id: application.platform_operator_id,
        rejection_reason: rejectionReason.trim(),
      },
    });

    return this.getApplication(id);
  }

  async teardownPlatformOperator(dto: TeardownPlatformOperatorDto) {
    const platformOperatorId = dto.platform_operator_id.trim();
    const graRegistryId = dto.gra_registry_id?.trim().toLowerCase();

    const application =
      await this.prisma.client.operator_applications.findUnique({
        where: { platform_operator_id: platformOperatorId },
      });

    const externalIds = new Set<string>();
    if (graRegistryId) externalIds.add(graRegistryId);
    if (application?.proposed_external_id) {
      externalIds.add(application.proposed_external_id.toLowerCase());
    }

    const operatorIds = new Set<string>();
    if (application?.created_operator_id) {
      operatorIds.add(application.created_operator_id);
    }

    for (const externalId of externalIds) {
      const operator = await this.prisma.client.operators.findUnique({
        where: { external_id: externalId },
        select: { id: true },
      });
      if (operator) operatorIds.add(operator.id);
    }

    await this.prisma.client.$transaction(async (tx) => {
      if (application) {
        await tx.operator_applications.delete({ where: { id: application.id } });
      }

      if (operatorIds.size > 0) {
        await tx.operators.deleteMany({
          where: { id: { in: [...operatorIds] } },
        });
      } else if (externalIds.size > 0) {
        await tx.operators.deleteMany({
          where: { external_id: { in: [...externalIds] } },
        });
      }
    });

    return {
      ok: true,
      platform_operator_id: platformOperatorId,
      removed_application: Boolean(application),
      removed_operators: operatorIds.size,
    };
  }

  private applicationData(dto: SubmitOperatorApplicationDto) {
    return {
      platform_operator_id: dto.platform_operator_id,
      proposed_external_id: dto.proposed_external_id,
      legal_name: dto.legal_name,
      trading_name: dto.trading_name,
      registration_number: dto.registration_number,
      kra_pin: dto.kra_pin,
      beneficial_owner: dto.beneficial_owner,
      email: dto.email,
      phone: dto.phone,
      county: dto.county,
      region: dto.region,
      website: dto.website,
      licence_number: dto.licence_number,
      staging_hostname: dto.staging_hostname,
      callback_url: dto.callback_url,
      status: "submitted" as const,
      rejection_reason: null,
      reviewed_by_id: null,
      reviewed_at: null,
      created_operator_id: null,
    };
  }

  private async deliverCredentialsToKenji(
    application: {
      id: string;
      platform_operator_id: string;
      proposed_external_id: string;
      callback_url: string;
    },
    credentials: { api_key: string; hmac_secret: string },
  ) {
    const payload: GraCredentialsCallbackPayload = {
      platform_operator_id: application.platform_operator_id,
      gra_registry_id: application.proposed_external_id,
      gra_application_id: application.id,
      api_key: credentials.api_key,
      hmac_secret: credentials.hmac_secret,
      status: "approved",
    };

    await this.postSignedCallback(application.callback_url, payload);
  }

  private async notifyKenjiRejection(
    application: {
      id: string;
      platform_operator_id: string;
      callback_url: string;
    },
    rejectionReason: string,
  ) {
    const rejectUrl = application.callback_url.replace(
      /\/credentials\/?$/,
      "/application-rejected",
    );

    const payload: GraApplicationRejectedPayload = {
      platform_operator_id: application.platform_operator_id,
      gra_application_id: application.id,
      status: "rejected",
      rejection_reason: rejectionReason,
    };

    await this.postSignedCallback(rejectUrl, payload);
  }

  private async postSignedCallback(
    url: string,
    payload: GraCredentialsCallbackPayload | GraApplicationRejectedPayload,
  ) {
    const secret = process.env.PLATFORM_GRA_INTEGRATION_SECRET?.trim();
    if (!secret) {
      throw new BadRequestException("PLATFORM_GRA_INTEGRATION_SECRET is not set");
    }

    const bodyJson = JSON.stringify(payload);
    const signature = signPlatformIntegrationBody(bodyJson, secret);

    let lastError: string | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Platform-Signature": signature,
          },
          body: bodyJson,
        });
        if (res.ok) return;
        lastError = await res.text().catch(() => `HTTP ${res.status}`);
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    throw new BadRequestException(
      `Kenji callback failed: ${lastError?.slice(0, 200) ?? "unknown error"}`,
    );
  }
}
