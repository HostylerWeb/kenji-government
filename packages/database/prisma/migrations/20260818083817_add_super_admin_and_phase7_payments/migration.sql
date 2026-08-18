-- CreateEnum
CREATE TYPE "payment_transaction_status" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('verified', 'pending', 'flagged');

-- CreateEnum
CREATE TYPE "tax_escrow_status" AS ENUM ('earmarked', 'withdrawn', 'reversed');

-- CreateEnum
CREATE TYPE "tax_withdrawal_batch_status" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "aml_alert_type" AS ENUM ('velocity', 'structuring', 'kyc_mismatch', 'other');

-- CreateEnum
CREATE TYPE "aml_alert_severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "aml_alert_status" AS ENUM ('open', 'reviewed', 'escalated', 'closed');

-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'super_admin';

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "external_transaction_id" TEXT NOT NULL,
    "operator_id" UUID NOT NULL,
    "operator_site_id" UUID NOT NULL,
    "ticket_reference" TEXT,
    "gross_amount" DECIMAL(18,2) NOT NULL,
    "operator_amount" DECIMAL(18,2) NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "status" "payment_transaction_status" NOT NULL DEFAULT 'pending',
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'pending',
    "aml_risk_score" INTEGER NOT NULL DEFAULT 0,
    "payer_fingerprint" TEXT,
    "county" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_escrow_entries" (
    "id" UUID NOT NULL,
    "payment_transaction_id" UUID NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL,
    "status" "tax_escrow_status" NOT NULL DEFAULT 'earmarked',
    "earmarked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawal_batch_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_escrow_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_withdrawal_batches" (
    "id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "destination_account_ref" TEXT NOT NULL,
    "gateway_batch_id" TEXT,
    "status" "tax_withdrawal_batch_status" NOT NULL DEFAULT 'pending',
    "initiated_by" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_withdrawal_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aml_alerts" (
    "id" UUID NOT NULL,
    "payment_transaction_id" UUID,
    "operator_id" UUID NOT NULL,
    "alert_type" "aml_alert_type" NOT NULL,
    "severity" "aml_alert_severity" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "status" "aml_alert_status" NOT NULL DEFAULT 'open',
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "aml_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_external_transaction_id_key" ON "payment_transactions"("external_transaction_id");

-- CreateIndex
CREATE INDEX "payment_transactions_operator_id_idx" ON "payment_transactions"("operator_id");

-- CreateIndex
CREATE INDEX "payment_transactions_operator_site_id_idx" ON "payment_transactions"("operator_site_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_completed_at_idx" ON "payment_transactions"("completed_at");

-- CreateIndex
CREATE INDEX "payment_transactions_created_at_idx" ON "payment_transactions"("created_at");

-- CreateIndex
CREATE INDEX "tax_escrow_entries_payment_transaction_id_idx" ON "tax_escrow_entries"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "tax_escrow_entries_status_idx" ON "tax_escrow_entries"("status");

-- CreateIndex
CREATE INDEX "tax_escrow_entries_withdrawal_batch_id_idx" ON "tax_escrow_entries"("withdrawal_batch_id");

-- CreateIndex
CREATE INDEX "tax_withdrawal_batches_business_date_idx" ON "tax_withdrawal_batches"("business_date");

-- CreateIndex
CREATE INDEX "tax_withdrawal_batches_status_idx" ON "tax_withdrawal_batches"("status");

-- CreateIndex
CREATE INDEX "aml_alerts_operator_id_idx" ON "aml_alerts"("operator_id");

-- CreateIndex
CREATE INDEX "aml_alerts_status_idx" ON "aml_alerts"("status");

-- CreateIndex
CREATE INDEX "aml_alerts_severity_idx" ON "aml_alerts"("severity");

-- CreateIndex
CREATE INDEX "aml_alerts_created_at_idx" ON "aml_alerts"("created_at");

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_operator_site_id_fkey" FOREIGN KEY ("operator_site_id") REFERENCES "operator_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_escrow_entries" ADD CONSTRAINT "tax_escrow_entries_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_escrow_entries" ADD CONSTRAINT "tax_escrow_entries_withdrawal_batch_id_fkey" FOREIGN KEY ("withdrawal_batch_id") REFERENCES "tax_withdrawal_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_withdrawal_batches" ADD CONSTRAINT "tax_withdrawal_batches_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_alerts" ADD CONSTRAINT "aml_alerts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
