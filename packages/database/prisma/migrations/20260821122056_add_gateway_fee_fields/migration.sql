-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "gateway_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gateway_fee_rate" DECIMAL(5,4) NOT NULL DEFAULT 0;
