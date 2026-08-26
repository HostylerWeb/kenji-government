-- CreateEnum
CREATE TYPE "operator_application_status" AS ENUM ('submitted', 'under_review', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "kra_pin" TEXT;

-- CreateTable
CREATE TABLE "operator_applications" (
    "id" UUID NOT NULL,
    "platform_operator_id" TEXT NOT NULL,
    "proposed_external_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT NOT NULL,
    "registration_number" TEXT,
    "kra_pin" TEXT,
    "beneficial_owner" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "county" TEXT,
    "region" TEXT,
    "website" TEXT,
    "licence_number" TEXT,
    "staging_hostname" TEXT NOT NULL,
    "callback_url" TEXT NOT NULL,
    "status" "operator_application_status" NOT NULL DEFAULT 'submitted',
    "rejection_reason" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_operator_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "operator_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operator_applications_platform_operator_id_key" ON "operator_applications"("platform_operator_id");

-- CreateIndex
CREATE INDEX "operator_applications_status_idx" ON "operator_applications"("status");

-- CreateIndex
CREATE INDEX "operator_applications_created_at_idx" ON "operator_applications"("created_at");

-- AddForeignKey
ALTER TABLE "operator_applications" ADD CONSTRAINT "operator_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_applications" ADD CONSTRAINT "operator_applications_created_operator_id_fkey" FOREIGN KEY ("created_operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
