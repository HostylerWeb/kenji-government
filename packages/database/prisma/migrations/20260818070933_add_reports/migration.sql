-- CreateEnum
CREATE TYPE "report_category" AS ENUM ('commercial', 'compliance', 'regional', 'payment', 'player_safety');

-- CreateEnum
CREATE TYPE "report_run_status" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "report_format" AS ENUM ('csv', 'pdf');

-- CreateTable
CREATE TABLE "report_definitions" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "report_category" NOT NULL,
    "required_role" "user_role" NOT NULL DEFAULT 'analyst',
    "parameters_schema" JSONB NOT NULL DEFAULT '{}',
    "is_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "schedule_recipients" JSONB,
    "schedule_cadence" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" UUID NOT NULL,
    "report_definition_id" UUID NOT NULL,
    "requested_by" UUID,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "format" "report_format" NOT NULL DEFAULT 'csv',
    "file_path" TEXT,
    "status" "report_run_status" NOT NULL DEFAULT 'queued',
    "error_message" TEXT,
    "is_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_slug_key" ON "report_definitions"("slug");

-- CreateIndex
CREATE INDEX "report_runs_report_definition_id_idx" ON "report_runs"("report_definition_id");

-- CreateIndex
CREATE INDEX "report_runs_status_idx" ON "report_runs"("status");

-- CreateIndex
CREATE INDEX "report_runs_created_at_idx" ON "report_runs"("created_at");

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_report_definition_id_fkey" FOREIGN KEY ("report_definition_id") REFERENCES "report_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
