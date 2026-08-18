-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_otp_new_device_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_trusted_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fingerprint_hash" VARCHAR(64) NOT NULL,
    "user_agent_label" VARCHAR(256),
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_trusted_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_trusted_devices_user_id_fingerprint_hash_key" ON "user_trusted_devices"("user_id", "fingerprint_hash");
CREATE INDEX "user_trusted_devices_user_id_idx" ON "user_trusted_devices"("user_id");

ALTER TABLE "user_trusted_devices" ADD CONSTRAINT "user_trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
