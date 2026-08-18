import type { PrismaClient } from "@prisma/client";
import { loadTreasuryAccountRef } from "../settings/load-settings";

export async function runEodTaxWithdrawal(prisma: PrismaClient) {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const businessDate = new Date(yesterday.toISOString().slice(0, 10));

  const existing = await prisma.tax_withdrawal_batches.findFirst({
    where: {
      business_date: businessDate,
      status: { in: ["pending", "completed"] },
    },
  });
  if (existing) {
    return { skipped: true, reason: "batch_exists", batch_id: existing.id };
  }

  const earmarked = await prisma.tax_escrow_entries.findMany({
    where: { status: "earmarked" },
    include: { payment_transaction: true },
  });

  const targetDate = businessDate.toISOString().slice(0, 10);
  const filtered = earmarked.filter((entry) => {
    const completed = entry.payment_transaction.completed_at;
    if (!completed) return false;
    return completed.toISOString().slice(0, 10) <= targetDate;
  });

  const total = filtered.reduce((sum, e) => sum + Number(e.tax_amount), 0);
  if (total <= 0) {
    return { skipped: true, reason: "no_earmarked_tax" };
  }

  const destination = await loadTreasuryAccountRef(prisma);
  const batch = await prisma.tax_withdrawal_batches.create({
    data: {
      business_date: businessDate,
      total_amount: total,
      destination_account_ref: destination,
      gateway_batch_id: `eod-auto-${Date.now()}`,
      status: "completed",
      completed_at: new Date(),
    },
  });

  await prisma.tax_escrow_entries.updateMany({
    where: { id: { in: filtered.map((e) => e.id) } },
    data: { withdrawal_batch_id: batch.id, status: "withdrawn" },
  });

  return {
    skipped: false,
    batch_id: batch.id,
    total_amount: total,
    entry_count: filtered.length,
  };
}
