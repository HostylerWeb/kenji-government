import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_TAX_RATE,
  monthlyReturnSchema,
} from "@kenji-government/shared";

export async function processMonthlyReturn(
  prisma: PrismaClient,
  ingestEventId: string,
) {
  const event = await prisma.ingest_events.findUnique({
    where: { id: ingestEventId },
    include: {
      operator_site: {
        include: { operator: true },
      },
    },
  });

  if (!event) {
    throw new Error(`Ingest event ${ingestEventId} not found`);
  }

  if (event.status === "processed") {
    return;
  }

  await prisma.ingest_events.update({
    where: { id: ingestEventId },
    data: { status: "processing" },
  });

  const parsed = monthlyReturnSchema.safeParse(event.raw_payload);
  if (!parsed.success) {
    throw new Error(
      `Invalid monthly return payload: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }

  const data = parsed.data;
  const operatorId = event.operator_site.operator_id;

  const period = await prisma.reporting_periods.upsert({
    where: {
      year_month: {
        year: data.reporting_year,
        month: data.reporting_month,
      },
    },
    update: {},
    create: {
      year: data.reporting_year,
      month: data.reporting_month,
      label: new Date(data.reporting_year, data.reporting_month - 1, 1).toLocaleString(
        "en-KE",
        { month: "long", year: "numeric" },
      ),
      starts_at: new Date(data.reporting_year, data.reporting_month - 1, 1),
      ends_at: new Date(data.reporting_year, data.reporting_month, 0),
    },
  });

  const taxDue = data.tax_due ?? data.gross_gaming_revenue * DEFAULT_TAX_RATE;
  const taxOutstanding = taxDue - data.tax_paid;

  const existingSubmission = await prisma.submissions.findFirst({
    where: {
      operator_id: operatorId,
      reporting_period_id: period.id,
    },
  });

  const submissionData = {
    tickets_sold: BigInt(data.tickets_sold),
    gross_revenue: data.gross_revenue,
    prizes_paid: data.prizes_paid,
    expenses: data.expenses,
    gross_gaming_revenue: data.gross_gaming_revenue,
    tax_due: taxDue,
    tax_paid: data.tax_paid,
    tax_outstanding: taxOutstanding,
    status: "pending" as const,
    submitted_at: new Date(),
    reviewed_by: null,
    reviewed_at: null,
    notes: data.notes ?? null,
  };

  if (existingSubmission) {
    await prisma.submissions.update({
      where: { id: existingSubmission.id },
      data: submissionData,
    });
  } else {
    await prisma.submissions.create({
      data: {
        operator_id: operatorId,
        reporting_period_id: period.id,
        ...submissionData,
      },
    });
  }

  await prisma.operator_monthly_snapshots.upsert({
    where: {
      operator_id_reporting_period_id: {
        operator_id: operatorId,
        reporting_period_id: period.id,
      },
    },
    update: {
      gross_gaming_revenue: data.gross_gaming_revenue,
      tax_paid: data.tax_paid,
      tickets_sold: BigInt(data.tickets_sold),
    },
    create: {
      operator_id: operatorId,
      reporting_period_id: period.id,
      gross_gaming_revenue: data.gross_gaming_revenue,
      tax_paid: data.tax_paid,
      tickets_sold: BigInt(data.tickets_sold),
    },
  });

  const snapshots = await prisma.operator_monthly_snapshots.findMany({
    where: { operator_id: operatorId },
    select: {
      gross_gaming_revenue: true,
      tax_paid: true,
      tickets_sold: true,
    },
  });

  const annualGgr = snapshots.reduce(
    (sum, row) => sum + Number(row.gross_gaming_revenue),
    0,
  );
  const totalTaxPaid = snapshots.reduce(
    (sum, row) => sum + Number(row.tax_paid),
    0,
  );
  const totalTickets = snapshots.reduce(
    (sum, row) => sum + Number(row.tickets_sold),
    0,
  );

  await prisma.operators.update({
    where: { id: operatorId },
    data: {
      annual_ggr: annualGgr,
      tax_paid: totalTaxPaid,
      tax_due: annualGgr * DEFAULT_TAX_RATE,
      monthly_tickets: Math.round(totalTickets / snapshots.length),
      last_submission_at: new Date(),
    },
  });

  await prisma.ingest_events.update({
    where: { id: ingestEventId },
    data: {
      status: "processed",
      processed_at: new Date(),
      error_message: null,
    },
  });
}
