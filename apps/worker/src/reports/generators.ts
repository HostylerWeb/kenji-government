import type { PrismaClient } from "@prisma/client";
import PDFDocument from "pdfkit";
import { REPORT_SLUGS } from "@kenji-government/shared";

type ReportRow = Record<string, string | number>;

export async function generateReportData(
  prisma: PrismaClient,
  slug: string,
  parameters: Record<string, unknown>,
): Promise<{ title: string; headers: string[]; rows: ReportRow[] }> {
  switch (slug) {
    case REPORT_SLUGS.GGR_BY_OPERATOR_MONTHLY:
      return generateGgrByOperatorMonthly(prisma, parameters);
    case REPORT_SLUGS.TAX_COLLECTED_VS_DUE:
      return generateTaxCollectedVsDue(prisma);
    case REPORT_SLUGS.COMPLIANCE_STATUS_SUMMARY:
      return generateComplianceSummary(prisma);
    case REPORT_SLUGS.REGIONAL_COMMERCIAL_SUMMARY:
      return generateRegionalSummary(prisma);
    case REPORT_SLUGS.OPERATOR_LICENCE_EXPIRY:
      return generateLicenceExpiry(prisma);
    case REPORT_SLUGS.PLAYER_SAFETY_AGGREGATES:
      return generatePlayerSafetyRegionalSummary(prisma);
    case REPORT_SLUGS.PAYMENT_GATEWAY_DAILY_VOLUME:
      return stubReport(
        "Payment Gateway Daily Volume",
        "Data available after Phase 7 Harambe Pay integration",
      );
    case REPORT_SLUGS.AML_ALERT_SUMMARY:
      return stubReport(
        "AML Alert Summary",
        "Data available after Phase 7 AML module",
      );
    default:
      throw new Error(`Unknown report slug: ${slug}`);
  }
}

function stubReport(title: string, note: string) {
  return {
    title,
    headers: ["Note"],
    rows: [{ Note: note }],
  };
}

async function generateGgrByOperatorMonthly(
  prisma: PrismaClient,
  parameters: Record<string, unknown>,
) {
  const year = Number(parameters.year ?? new Date().getFullYear());
  const month = Number(parameters.month ?? new Date().getMonth() + 1);

  const period = await prisma.reporting_periods.findFirst({
    where: { year, month },
  });

  if (!period) {
    return {
      title: `GGR by Operator — ${year}-${String(month).padStart(2, "0")}`,
      headers: ["Note"],
      rows: [{ Note: "No reporting period found for selected month" }],
    };
  }

  const snapshots = await prisma.operator_monthly_snapshots.findMany({
    where: { reporting_period_id: period.id },
    include: {
      operator: {
        select: {
          external_id: true,
          trading_name: true,
          county: true,
        },
      },
    },
    orderBy: { gross_gaming_revenue: "desc" },
  });

  return {
    title: `GGR by Operator — ${period.label}`,
    headers: [
      "Operator ID",
      "Trading Name",
      "County",
      "GGR (KES)",
      "Tax Paid (KES)",
      "Tickets Sold",
    ],
    rows: snapshots.map((s) => ({
      "Operator ID": s.operator.external_id,
      "Trading Name": s.operator.trading_name,
      County: s.operator.county ?? "",
      "GGR (KES)": Number(s.gross_gaming_revenue).toLocaleString("en-KE"),
      "Tax Paid (KES)": Number(s.tax_paid).toLocaleString("en-KE"),
      "Tickets Sold": Number(s.tickets_sold).toLocaleString("en-KE"),
    })),
  };
}

async function generateTaxCollectedVsDue(prisma: PrismaClient) {
  const operators = await prisma.operators.findMany({
    where: { status: "active" },
    orderBy: { trading_name: "asc" },
  });

  return {
    title: "Tax Collected vs Due",
    headers: [
      "Operator ID",
      "Trading Name",
      "Tax Paid (KES)",
      "Tax Due (KES)",
      "Outstanding (KES)",
    ],
    rows: operators.map((op) => {
      const paid = Number(op.tax_paid ?? 0);
      const due = Number(op.tax_due ?? 0);
      return {
        "Operator ID": op.external_id,
        "Trading Name": op.trading_name,
        "Tax Paid (KES)": paid.toLocaleString("en-KE"),
        "Tax Due (KES)": due.toLocaleString("en-KE"),
        "Outstanding (KES)": Math.max(0, due - paid).toLocaleString("en-KE"),
      };
    }),
  };
}

async function generateComplianceSummary(prisma: PrismaClient) {
  const operators = await prisma.operators.groupBy({
    by: ["compliance_status"],
    _count: { _all: true },
  });

  return {
    title: "Compliance Status Summary",
    headers: ["Status", "Operator Count"],
    rows: operators.map((row) => ({
      Status: row.compliance_status,
      "Operator Count": row._count._all,
    })),
  };
}

async function generateRegionalSummary(prisma: PrismaClient) {
  const operators = await prisma.operators.findMany({
    where: { status: "active" },
  });

  const byCounty = new Map<string, { count: number; ggr: number }>();
  for (const op of operators) {
    const county = op.county ?? "Unknown";
    const entry = byCounty.get(county) ?? { count: 0, ggr: 0 };
    entry.count += 1;
    entry.ggr += Number(op.annual_ggr ?? 0);
    byCounty.set(county, entry);
  }

  return {
    title: "Regional Commercial Summary",
    headers: ["County", "Active Operators", "Annual GGR (KES)"],
    rows: [...byCounty.entries()]
      .sort((a, b) => b[1].ggr - a[1].ggr)
      .map(([county, data]) => ({
        County: county,
        "Active Operators": data.count,
        "Annual GGR (KES)": data.ggr.toLocaleString("en-KE"),
      })),
  };
}

async function generatePlayerSafetyRegionalSummary(prisma: PrismaClient) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  since.setUTCHours(0, 0, 0, 0);

  const aggregates = await prisma.player_safety_aggregates.findMany({
    where: { bucket_date: { gte: since } },
    orderBy: [{ county: "asc" }, { bucket_date: "asc" }],
  });

  if (aggregates.length === 0) {
    return {
      title: "Player Safety Regional Summary",
      headers: ["Note"],
      rows: [{ Note: "No player safety aggregates in the last 30 days" }],
    };
  }

  const byCounty = new Map<
    string,
    {
      play_safe: number;
      self_exclusion: number;
      sessions: number;
      peak_hour: number | null;
    }
  >();

  for (const row of aggregates) {
    const entry = byCounty.get(row.county) ?? {
      play_safe: 0,
      self_exclusion: 0,
      sessions: 0,
      peak_hour: row.peak_hour,
    };
    entry.play_safe += Number(row.play_safe_activations);
    entry.self_exclusion += Number(row.self_exclusion_requests);
    entry.sessions += Number(row.session_count);
    if (row.peak_hour !== null) {
      entry.peak_hour = row.peak_hour;
    }
    byCounty.set(row.county, entry);
  }

  return {
    title: "Player Safety Regional Summary (last 30 days)",
    headers: [
      "County",
      "Play Safe Activations",
      "Self-Exclusion Requests",
      "Session Count",
      "Peak Hour (UTC)",
    ],
    rows: [...byCounty.entries()]
      .sort((a, b) => b[1].play_safe - a[1].play_safe)
      .map(([county, data]) => ({
        County: county,
        "Play Safe Activations": data.play_safe,
        "Self-Exclusion Requests": data.self_exclusion,
        "Session Count": data.sessions,
        "Peak Hour (UTC)": data.peak_hour ?? "",
      })),
  };
}

async function generateLicenceExpiry(prisma: PrismaClient) {
  const in90Days = new Date();
  in90Days.setDate(in90Days.getDate() + 90);

  const licences = await prisma.licences.findMany({
    where: {
      status: "active",
      expires_at: { lte: in90Days },
    },
    include: {
      operator: { select: { external_id: true, trading_name: true } },
    },
    orderBy: { expires_at: "asc" },
  });

  return {
    title: "Operator Licence Expiry (next 90 days)",
    headers: [
      "Operator ID",
      "Trading Name",
      "Licence Number",
      "Expires At",
    ],
    rows: licences.map((lic) => ({
      "Operator ID": lic.operator.external_id,
      "Trading Name": lic.operator.trading_name,
      "Licence Number": lic.licence_number,
      "Expires At": lic.expires_at.toISOString().slice(0, 10),
    })),
  };
}

export function buildCsv(
  headers: string[],
  rows: ReportRow[],
): Buffer {
  const escape = (value: string | number) => {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ];
  return Buffer.from(lines.join("\n"), "utf-8");
}

export async function buildPdf(
  title: string,
  headers: string[],
  rows: ReportRow[],
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk as Buffer));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.fontSize(16).text("Gambling Regulatory Authority — Kenya", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(14).text(title, { align: "center" });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown();

  const colWidth = (doc.page.width - 100) / headers.length;
  let y = doc.y;

  doc.fontSize(9).fillColor("#333");
  headers.forEach((header, i) => {
    doc.text(header, 50 + i * colWidth, y, { width: colWidth - 4 });
  });
  y += 18;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke();
  y += 8;

  for (const row of rows) {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 50;
    }
    headers.forEach((header, i) => {
      doc.text(String(row[header] ?? ""), 50 + i * colWidth, y, {
        width: colWidth - 4,
      });
    });
    y += 16;
  }

  doc.end();
  return done;
}
