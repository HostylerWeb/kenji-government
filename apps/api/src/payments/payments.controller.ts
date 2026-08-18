import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@kenji-government/shared";
import { JwtAuthGuard, RolesGuard } from "../auth/guards/auth.guards";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("overview")
  @Roles("supervisor")
  overview() {
    return this.payments.overview();
  }

  @Get("transactions")
  @Roles("analyst")
  listTransactions(
    @Query("status") status?: string,
    @Query("operator_external_id") operatorExternalId?: string,
    @Query("search") search?: string,
    @Query("aml_flag") amlFlag?: string,
    @Query("limit") limit?: string,
  ) {
    return this.payments.listTransactions({
      status,
      operator_external_id: operatorExternalId,
      search,
      aml_flag: amlFlag === "true",
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("transactions/:id")
  @Roles("analyst")
  getTransaction(@Param("id") id: string) {
    return this.payments.getTransaction(id);
  }

  @Get("tax-escrow/summary")
  @Roles("supervisor")
  taxEscrowSummary() {
    return this.payments.taxEscrowSummary();
  }

  @Get("tax-escrow")
  @Roles("supervisor")
  listTaxEscrow(@Query("status") status?: string, @Query("limit") limit?: string) {
    return this.payments.listTaxEscrow({
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("withdrawals")
  @Roles("supervisor")
  listWithdrawals(@Query("limit") limit?: string) {
    return this.payments.listWithdrawalBatches(
      limit ? Number(limit) : undefined,
    );
  }

  @Post("withdrawals")
  @Roles("supervisor")
  initiateWithdrawal(
    @CurrentUser() user: AuthUser,
    @Body() body: { business_date?: string },
  ) {
    return this.payments.initiateWithdrawal(user, body.business_date);
  }

  @Post("withdrawals/:id/complete")
  @Roles("super_admin")
  completeWithdrawal(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { gateway_batch_id?: string },
  ) {
    return this.payments.completeWithdrawal(user, id, body.gateway_batch_id);
  }

  @Get("aml-alerts")
  @Roles("supervisor")
  listAmlAlerts(@Query("status") status?: string, @Query("limit") limit?: string) {
    return this.payments.listAmlAlerts({
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch("aml-alerts/:id")
  @Roles("supervisor")
  updateAmlAlert(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { status: "reviewed" | "escalated" | "closed" },
  ) {
    return this.payments.updateAmlAlert(user, id, body.status);
  }

  @Post("aml-alerts/:id/escalate-to-enforcement")
  @Roles("supervisor")
  escalateAmlToEnforcement(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.payments.escalateAmlToEnforcement(user, id);
  }

  @Get("operator-stats")
  @Roles("analyst")
  operatorStats() {
    return this.payments.operatorStats();
  }
}
