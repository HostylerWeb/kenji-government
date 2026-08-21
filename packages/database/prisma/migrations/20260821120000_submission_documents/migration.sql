-- AlterEnum
ALTER TYPE "document_type" ADD VALUE IF NOT EXISTS 'monthly_return';
ALTER TYPE "document_type" ADD VALUE IF NOT EXISTS 'bank_statement';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "submission_id" UUID;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_submission_id_fkey'
  ) THEN
    ALTER TABLE "documents"
      ADD CONSTRAINT "documents_submission_id_fkey"
      FOREIGN KEY ("submission_id") REFERENCES "submissions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documents_submission_id_idx" ON "documents"("submission_id");
