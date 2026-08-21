import { Injectable } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { REPORT_SLUGS } from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";

type ReportRow = Record<string, string | number>;

export type ReportChartSeries = {
  key: string;
  label: string;
  color?: string;
};

export type ReportPreviewChart = {
  type: "bar" | "pie" | "line";
  x_key: string;
  series: ReportChartSeries[];
  data: Array<Record<string, string | number>>;
};

export type ReportPreviewSummary = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type ReportPreview = {
  title: string;
  headers: string[];
  rows: ReportRow[];
  row_count: number;
  summary: ReportPreviewSummary[];
  chart: ReportPreviewChart | null;
  table_view: "operators" | "compliance" | "regional" | "payments" | "licences" | "generic";
};

@Injectable()
export class ReportDataService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(
    slug: string,
    parameters: Record<string, unknown> = {},
  ): Promise<ReportPreview> {
    const base = await this.generateReportData(
      this.prisma.client,
      slug,
      parameters,
    );
    return this.enrichPreview(slug, base);
  }

  async generateReportData(
    prisma: PrismaClient,
    slug: string,
    parameters: Record<string, unknown>,
  ): Promise<{ title: string; headers: string[]; rows: ReportRow[] }> {
    switch (slug) {
      case REPORT_SLUGS.GGR_BY_OPERATOR_MONTHLY:
        return this.ggrByOperatorMonthly(prisma, parameters);
      case REPORT_SLUGS.TAX_COLLECTED_VS_DUE:
        return this.taxCollectedVsDue(prisma);
      case REPORT_SLUGS.COMPLIANCE_STATUS_SUMMARY:
        return this.complianceSummary(prisma);
      case REPORT_SLUGS.REGIONAL_COMMERCIAL_SUMMARY:
        return this.regionalSummary(prisma);
      case REPORT_SLUGS.OPERATOR_LICENCE_EXPIRY:
        return this.licenceExpiry(prisma);
      case REPORT_SLUGS.PLAYER_SAFETY_AGGREGATES:
        return this.playerSafetyRegionalSummary(prisma);
      case REPORT_SLUGS.PAYMENT_GATEWAY_DAILY_VOLUME:
        return this.paymentGatewayDailyVolume(prisma, parameters);
      case REPORT_SLUGS.AML_ALERT_SUMMARY:
        return this.amlAlertSummary(prisma);
      case REPORT_SLUGS.CBK_AML_PAYMENT_EXPORT:
        return this.cbkAmlPaymentExport(prisma, parameters);
      default:
        throw new Error(`Unknown report slug: ${slug}`);
    }
  }

  private enrichPreview(
    slug: string,
    base: { title: string; headers: string[]; rows: ReportRow[] },
  ): ReportPreview {
    const rowCount = base.rows.length;
    const isNoteOnly =
      base.headers.length === 1 && base.headers[0] === "Note";

    if (isNoteOnly || rowCount === 0) {
      return {
        title: base.title,
        headers: base.headers,
        rows: base.rows,
        row_count: rowCount,
        summary: [],
        chart: null,
        table_view: "generic",
      };
    }

    switch (slug) {
      case REPORT_SLUGS.GGR_BY_OPERATOR_MONTHLY:
        return this.enrichGgrPreview(base, rowCount);
      case REPORT_SLUGS.TAX_COLLECTED_VS_DUE:
        return this.enrichTaxPreview(base, rowCount);
      case REPORT_SLUGS.COMPLIANCE_STATUS_SUMMARY:
        return this.enrichCompliancePreview(base, rowCount);
      case REPORT_SLUGS.REGIONAL_COMMERCIAL_SUMMARY:
        return this.enrichRegionalPreview(base, rowCount);
      case REPORT_SLUGS.PLAYER_SAFETY_AGGREGATES:
        return this.enrichPlayerSafetyPreview(base, rowCount);
      case REPORT_SLUGS.PAYMENT_GATEWAY_DAILY_VOLUME:
        return this.enrichPaymentVolumePreview(base, rowCount);
      case REPORT_SLUGS.AML_ALERT_SUMMARY:
        return this.enrichAmlPreview(base, rowCount);
      case REPORT_SLUGS.CBK_AML_PAYMENT_EXPORT:
        return this.enrichCbkPreview(base, rowCount);
      case REPORT_SLUGS.OPERATOR_LICENCE_EXPIRY:
        return this.enrichLicencePreview(base, rowCount);
      default:
        return {
          title: base.title,
          headers: base.headers,
          rows: base.rows,
          row_count: rowCount,
          summary: [{ label: "Rows", value: String(rowCount) }],
          chart: null,
          table_view: "generic",
        };
    }
  }

  private enrichGgrPreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const chartData = base.rows.slice(0, 12).map((row) => ({
      name: String(row["Trading Name"] ?? "").slice(0, 18),
      ggr: this.parseLocaleNumber(row["GGR (KES)"]),
      tax: this.parseLocaleNumber(row["Tax Paid (KES)"]),
    }));
    const totalGgr = chartData.reduce((sum, row) => sum + row.ggr, 0);
    const totalTax = chartData.reduce((sum, row) => sum + row.tax, 0);

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows,
      row_count: rowCount,
      summary: [
        { label: "Operators", value: String(rowCount) },
        { label: "Total GGR", value: this.formatKsh(totalGgr) },
        { label: "Tax Paid", value: this.formatKsh(totalTax), tone: "success" },
      ],
      chart: {
        type: "bar",
        x_key: "name",
        series: [
          { key: "ggr", label: "GGR (KES)", color: "#0B3D91" },
          { key: "tax", label: "Tax Paid (KES)", color: "#1B7F4E" },
        ],
        data: chartData,
      },
      table_view: "operators",
    };
  }

  private enrichTaxPreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const chartData = base.rows
      .map((row) => ({
        name: String(row["Trading Name"] ?? "").slice(0, 18),
        paid: this.parseLocaleNumber(row["Tax Paid (KES)"]),
        due: this.parseLocaleNumber(row["Tax Due (KES)"]),
        outstanding: this.parseLocaleNumber(row["Outstanding (KES)"]),
      }))
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 12);

    const totalOutstanding = base.rows.reduce(
      (sum, row) => sum + this.parseLocaleNumber(row["Outstanding (KES)"]),
      0,
    );
    const withOutstanding = base.rows.filter(
      (row) => this.parseLocaleNumber(row["Outstanding (KES)"]) > 0,
    ).length;

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows,
      row_count: rowCount,
      summary: [
        { label: "Active operators", value: String(rowCount) },
        {
          label: "With outstanding tax",
          value: String(withOutstanding),
          tone: withOutstanding > 0 ? "warning" : "success",
        },
        {
          label: "Total outstanding",
          value: this.formatKsh(totalOutstanding),
          tone: totalOutstanding > 0 ? "danger" : "success",
        },
      ],
      chart: {
        type: "bar",
        x_key: "name",
        series: [
          { key: "paid", label: "Paid (KES)", color: "#1B7F4E" },
          { key: "outstanding", label: "Outstanding (KES)", color: "#C0392B" },
        ],
        data: chartData,
      },
      table_view: "operators",
    };
  }

  private enrichCompliancePreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const chartData = base.rows.map((row) => ({
      status: this.formatComplianceStatus(String(row.Status ?? "")),
      count: Number(row["Operator Count"] ?? 0),
    }));
    const total = chartData.reduce((sum, row) => sum + row.count, 0);
    const nonCompliant =
      chartData.find((row) => row.status.toLowerCase().includes("non"))?.count ?? 0;

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows.map((row) => ({
        Status: this.formatComplianceStatus(String(row.Status ?? "")),
        "Operator Count": row["Operator Count"],
      })),
      row_count: rowCount,
      summary: [
        { label: "Total operators", value: String(total) },
        {
          label: "Non-compliant",
          value: String(nonCompliant),
          tone: nonCompliant > 0 ? "danger" : "success",
        },
        { label: "Status tiers", value: String(rowCount) },
      ],
      chart: {
        type: "pie",
        x_key: "status",
        series: [{ key: "count", label: "Operators" }],
        data: chartData,
      },
      table_view: "compliance",
    };
  }

  private enrichRegionalPreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const chartData = base.rows.slice(0, 12).map((row) => ({
      county: String(row.County ?? ""),
      operators: Number(row["Active Operators"] ?? 0),
      ggr: this.parseLocaleNumber(row["Annual GGR (KES)"]),
    }));
    const totalGgr = chartData.reduce((sum, row) => sum + row.ggr, 0);

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows,
      row_count: rowCount,
      summary: [
        { label: "Counties", value: String(rowCount) },
        { label: "Top counties GGR", value: this.formatKsh(totalGgr) },
      ],
      chart: {
        type: "bar",
        x_key: "county",
        series: [{ key: "ggr", label: "Annual GGR (KES)", color: "#0B3D91" }],
        data: chartData,
      },
      table_view: "regional",
    };
  }

  private enrichPlayerSafetyPreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const chartData = base.rows.slice(0, 10).map((row) => ({
      county: String(row.County ?? ""),
      play_safe: Number(row["Play Safe Activations"] ?? 0),
      self_exclusion: Number(row["Self-Exclusion Requests"] ?? 0),
    }));
    const playSafeTotal = chartData.reduce((sum, row) => sum + row.play_safe, 0);

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows,
      row_count: rowCount,
      summary: [
        { label: "Counties tracked", value: String(rowCount) },
        { label: "Play Safe (30d)", value: String(playSafeTotal) },
      ],
      chart: {
        type: "bar",
        x_key: "county",
        series: [
          { key: "play_safe", label: "Play Safe", color: "#1B7F4E" },
          { key: "self_exclusion", label: "Self-exclusion", color: "#C0392B" },
        ],
        data: chartData,
      },
      table_view: "regional",
    };
  }

  private enrichPaymentVolumePreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const byOperator = new Map<string, { gross: number; tax: number; count: number }>();
    for (const row of base.rows) {
      const operator = String(row.Operator ?? "Unknown");
      const entry = byOperator.get(operator) ?? { gross: 0, tax: 0, count: 0 };
      entry.gross += this.parseLocaleNumber(row["Gross (KES)"]);
      entry.tax += this.parseLocaleNumber(row["Tax (KES)"]);
      entry.count += 1;
      byOperator.set(operator, entry);
    }

    const chartData = [...byOperator.entries()]
      .map(([name, data]) => ({
        name: name.slice(0, 18),
        gross: data.gross,
        tax: data.tax,
        transactions: data.count,
      }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 10);

    const totalGross = chartData.reduce((sum, row) => sum + row.gross, 0);
    const totalTax = chartData.reduce((sum, row) => sum + row.tax, 0);

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows,
      row_count: rowCount,
      summary: [
        { label: "Transactions", value: String(rowCount) },
        { label: "Gross volume", value: this.formatKsh(totalGross) },
        { label: "Tax earmarked", value: this.formatKsh(totalTax), tone: "success" },
      ],
      chart: chartData.length
        ? {
            type: "bar",
            x_key: "name",
            series: [{ key: "gross", label: "Gross (KES)", color: "#0B3D91" }],
            data: chartData,
          }
        : null,
      table_view: "payments",
    };
  }

  private enrichAmlPreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const byStatus = new Map<string, number>();
    const openCount = base.rows.filter((row) => row.Status === "open").length;
    for (const row of base.rows) {
      const status = String(row.Status ?? "unknown");
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    }

    const chartData = [...byStatus.entries()].map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
    }));

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows,
      row_count: rowCount,
      summary: [
        { label: "Total alerts", value: String(rowCount) },
        {
          label: "Open",
          value: String(openCount),
          tone: openCount > 0 ? "warning" : "success",
        },
      ],
      chart: {
        type: "pie",
        x_key: "status",
        series: [{ key: "count", label: "Alerts" }],
        data: chartData,
      },
      table_view: "payments",
    };
  }

  private enrichCbkPreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const byDate = new Map<string, { gross: number; count: number }>();
    for (const row of base.rows) {
      const date = String(row.Date ?? "");
      const entry = byDate.get(date) ?? { gross: 0, count: 0 };
      entry.gross += this.parseLocaleNumber(row["Gross (KES)"]);
      entry.count += 1;
      byDate.set(date, entry);
    }

    const chartData = [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        gross: data.gross,
        transactions: data.count,
      }));

    const totalGross = chartData.reduce((sum, row) => sum + row.gross, 0);

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows.slice(0, 100),
      row_count: rowCount,
      summary: [
        { label: "Payments", value: String(rowCount) },
        { label: "Gross volume", value: this.formatKsh(totalGross) },
        { label: "Days in range", value: String(chartData.length) },
      ],
      chart: chartData.length
        ? {
            type: "line",
            x_key: "date",
            series: [{ key: "gross", label: "Gross (KES)", color: "#0B3D91" }],
            data: chartData,
          }
        : null,
      table_view: "payments",
    };
  }

  private enrichLicencePreview(
    base: { title: string; headers: string[]; rows: ReportRow[] },
    rowCount: number,
  ): ReportPreview {
    const within30 = base.rows.filter((row) => {
      const expires = new Date(String(row["Expires At"]));
      const days = (expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    return {
      title: base.title,
      headers: base.headers,
      rows: base.rows,
      row_count: rowCount,
      summary: [
        { label: "Expiring (90d)", value: String(rowCount) },
        {
          label: "Within 30 days",
          value: String(within30),
          tone: within30 > 0 ? "danger" : "success",
        },
      ],
      chart: null,
      table_view: "licences",
    };
  }

  private async ggrByOperatorMonthly(
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

  private async taxCollectedVsDue(prisma: PrismaClient) {
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

  private async complianceSummary(prisma: PrismaClient) {
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

  private async regionalSummary(prisma: PrismaClient) {
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

  private async playerSafetyRegionalSummary(prisma: PrismaClient) {
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

  private async licenceExpiry(prisma: PrismaClient) {
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

  private async paymentGatewayDailyVolume(
    prisma: PrismaClient,
    parameters: Record<string, unknown>,
  ) {
    const date =
      typeof parameters.date === "string"
        ? parameters.date
        : new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });

    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const payments = await prisma.payment_transactions.findMany({
      where: {
        status: "completed",
        completed_at: { gte: start, lt: end },
      },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
      },
      orderBy: { completed_at: "asc" },
    });

    return {
      title: `Payment Gateway Daily Volume — ${date}`,
      headers: [
        "Transaction ID",
        "Operator",
        "Gross (KES)",
        "Tax (KES)",
        "KYC",
        "Completed At",
      ],
      rows: payments.map((p) => ({
        "Transaction ID": p.external_transaction_id,
        Operator: p.operator.trading_name,
        "Gross (KES)": Number(p.gross_amount).toLocaleString("en-KE"),
        "Tax (KES)": Number(p.tax_amount).toLocaleString("en-KE"),
        KYC: p.kyc_status,
        "Completed At": p.completed_at?.toISOString() ?? "",
      })),
    };
  }

  private async amlAlertSummary(prisma: PrismaClient) {
    const alerts = await prisma.aml_alerts.findMany({
      include: {
        operator: { select: { external_id: true, trading_name: true } },
      },
      orderBy: { created_at: "desc" },
      take: 500,
    });

    return {
      title: "AML Alert Summary",
      headers: [
        "Operator",
        "Type",
        "Severity",
        "Status",
        "Created At",
      ],
      rows: alerts.map((a) => ({
        Operator: a.operator.trading_name,
        Type: a.alert_type,
        Severity: a.severity,
        Status: a.status,
        "Created At": a.created_at.toISOString(),
      })),
    };
  }

  private async cbkAmlPaymentExport(
    prisma: PrismaClient,
    parameters: Record<string, unknown>,
  ) {
    const days = Number(parameters.days ?? 30);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);

    const payments = await prisma.payment_transactions.findMany({
      where: { created_at: { gte: since } },
      include: {
        operator: { select: { external_id: true, trading_name: true } },
        aml_alerts: {
          select: { alert_type: true, severity: true, status: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return {
      title: `CBK AML Payment Export (last ${days} days)`,
      headers: [
        "Date",
        "Operator ID",
        "Operator",
        "Transaction Ref",
        "Gross (KES)",
        "Tax (KES)",
        "KYC Status",
        "AML Risk Score",
        "AML Alert Count",
        "Status",
      ],
      rows: payments.map((p) => ({
        Date: p.created_at.toISOString().slice(0, 10),
        "Operator ID": p.operator.external_id,
        Operator: p.operator.trading_name,
        "Transaction Ref": p.external_transaction_id,
        "Gross (KES)": Number(p.gross_amount).toLocaleString("en-KE"),
        "Tax (KES)": Number(p.tax_amount).toLocaleString("en-KE"),
        "KYC Status": p.kyc_status,
        "AML Risk Score": p.aml_risk_score,
        "AML Alert Count": p.aml_alerts.length,
        Status: p.status,
      })),
    };
  }

  private parseLocaleNumber(value: string | number | undefined): number {
    if (typeof value === "number") return value;
    if (!value) return 0;
    return Number(String(value).replace(/,/g, "")) || 0;
  }

  private formatKsh(amount: number): string {
    return `Ksh ${amount.toLocaleString("en-KE")}`;
  }

  private formatComplianceStatus(status: string): string {
    return status
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
