-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'supervisor', 'analyst', 'auditor');

-- CreateEnum
CREATE TYPE "operator_status" AS ENUM ('active', 'suspended', 'revoked', 'pending');

-- CreateEnum
CREATE TYPE "compliance_status" AS ENUM ('compliant', 'at_risk', 'non_compliant');

-- CreateEnum
CREATE TYPE "operator_site_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "licence_type" AS ENUM ('raffle', 'competition', 'mixed');

-- CreateEnum
CREATE TYPE "licence_status" AS ENUM ('active', 'expired', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('pending', 'approved', 'rejected', 'revision_requested');

-- CreateEnum
CREATE TYPE "ingest_event_status" AS ENUM ('received', 'processing', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "enforcement_case_type" AS ENUM ('warning', 'fine', 'investigation', 'suspension');

-- CreateEnum
CREATE TYPE "enforcement_case_status" AS ENUM ('open', 'resolved', 'escalated', 'closed');

-- CreateEnum
CREATE TYPE "enforcement_action_type" AS ENUM ('notice', 'warning', 'fine', 'suspension', 'revocation');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('trading_licence', 'registration', 'tax_certificate', 'audit_report', 'insurance', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'analyst',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT NOT NULL,
    "registration_number" TEXT,
    "beneficial_owner" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "county" TEXT,
    "region" TEXT,
    "website" TEXT,
    "status" "operator_status" NOT NULL DEFAULT 'active',
    "compliance_status" "compliance_status" NOT NULL DEFAULT 'compliant',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "annual_ggr" DECIMAL(18,2),
    "tax_paid" DECIMAL(18,2),
    "tax_due" DECIMAL(18,2),
    "monthly_tickets" INTEGER,
    "last_submission_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_sites" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "operator_site_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "operator_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licences" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "licence_number" TEXT NOT NULL,
    "licence_type" "licence_type" NOT NULL DEFAULT 'raffle',
    "issued_at" DATE NOT NULL,
    "expires_at" DATE NOT NULL,
    "status" "licence_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "licences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_credentials" (
    "id" UUID NOT NULL,
    "operator_site_id" UUID NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "api_key_prefix" TEXT NOT NULL,
    "hmac_secret_hash" TEXT NOT NULL,
    "allowed_ips" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_periods" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "starts_at" DATE NOT NULL,
    "ends_at" DATE NOT NULL,

    CONSTRAINT "reporting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "reporting_period_id" UUID NOT NULL,
    "tickets_sold" BIGINT NOT NULL DEFAULT 0,
    "gross_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "prizes_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gross_gaming_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_due" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "submission_status" NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_events" (
    "id" UUID NOT NULL,
    "operator_site_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "status" "ingest_event_status" NOT NULL DEFAULT 'received',
    "error_message" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingest_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enforcement_cases" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "case_number" TEXT NOT NULL,
    "case_type" "enforcement_case_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "enforcement_case_status" NOT NULL DEFAULT 'open',
    "opened_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "enforcement_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enforcement_actions" (
    "id" UUID NOT NULL,
    "enforcement_case_id" UUID NOT NULL,
    "action_type" "enforcement_action_type" NOT NULL,
    "details" TEXT,
    "fine_amount" DECIMAL(18,2),
    "performed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enforcement_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "title" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_monthly_snapshots" (
    "id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "reporting_period_id" UUID NOT NULL,
    "gross_gaming_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tickets_sold" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "operator_monthly_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "operators_external_id_key" ON "operators"("external_id");

-- CreateIndex
CREATE INDEX "operator_sites_operator_id_idx" ON "operator_sites"("operator_id");

-- CreateIndex
CREATE UNIQUE INDEX "licences_licence_number_key" ON "licences"("licence_number");

-- CreateIndex
CREATE INDEX "licences_operator_id_idx" ON "licences"("operator_id");

-- CreateIndex
CREATE INDEX "api_credentials_operator_site_id_idx" ON "api_credentials"("operator_site_id");

-- CreateIndex
CREATE UNIQUE INDEX "reporting_periods_year_month_key" ON "reporting_periods"("year", "month");

-- CreateIndex
CREATE INDEX "submissions_operator_id_idx" ON "submissions"("operator_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_events_idempotency_key_key" ON "ingest_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "ingest_events_operator_site_id_idx" ON "ingest_events"("operator_site_id");

-- CreateIndex
CREATE INDEX "ingest_events_status_idx" ON "ingest_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "enforcement_cases_case_number_key" ON "enforcement_cases"("case_number");

-- CreateIndex
CREATE INDEX "enforcement_cases_operator_id_idx" ON "enforcement_cases"("operator_id");

-- CreateIndex
CREATE INDEX "enforcement_cases_status_idx" ON "enforcement_cases"("status");

-- CreateIndex
CREATE INDEX "documents_operator_id_idx" ON "documents"("operator_id");

-- CreateIndex
CREATE UNIQUE INDEX "operator_monthly_snapshots_operator_id_reporting_period_id_key" ON "operator_monthly_snapshots"("operator_id", "reporting_period_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_sites" ADD CONSTRAINT "operator_sites_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licences" ADD CONSTRAINT "licences_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_operator_site_id_fkey" FOREIGN KEY ("operator_site_id") REFERENCES "operator_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingest_events" ADD CONSTRAINT "ingest_events_operator_site_id_fkey" FOREIGN KEY ("operator_site_id") REFERENCES "operator_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enforcement_cases" ADD CONSTRAINT "enforcement_cases_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enforcement_cases" ADD CONSTRAINT "enforcement_cases_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enforcement_actions" ADD CONSTRAINT "enforcement_actions_enforcement_case_id_fkey" FOREIGN KEY ("enforcement_case_id") REFERENCES "enforcement_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enforcement_actions" ADD CONSTRAINT "enforcement_actions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_monthly_snapshots" ADD CONSTRAINT "operator_monthly_snapshots_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_monthly_snapshots" ADD CONSTRAINT "operator_monthly_snapshots_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
