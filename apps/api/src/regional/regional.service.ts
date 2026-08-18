import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AGE_BANDS,
  DAY_LABELS,
  emptyHourByDayMatrix,
  STAKE_BANDS,
} from "@kenji-government/shared";
import { PrismaService } from "../prisma/prisma.service";

type BandCounts = Record<string, number>;
type HourMatrix = Record<string, number[]>;

@Injectable()
export class RegionalService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(days = 30) {
    const since = this.daysAgo(days);
    const counties = await this.getCountyCommercial();
    const safety = await this.getSafetyByCounty(since);
    const heatmap = await this.getNationalHeatmap(since);
    const stakeBands = await this.getNationalStakeBands(since);
    const ageBands = await this.getNationalAgeBands(since);

    return {
      days,
      counties,
      play_safe_by_county: safety.play_safe_by_county,
      self_exclusion_by_county: safety.self_exclusion_by_county,
      peak_time_heatmap: heatmap,
      stake_band_distribution: stakeBands,
      age_band_distribution: ageBands,
      disclaimer:
        "Anonymised aggregate data only. No individual player identifiers are stored or exported.",
    };
  }

  async getCountyDetail(county: string, days = 30) {
    const since = this.daysAgo(days);
    const normalizedCounty = county.trim();

    const operators = await this.prisma.client.operators.findMany({
      where: { county: normalizedCounty, status: "active" },
      select: {
        external_id: true,
        trading_name: true,
        annual_ggr: true,
        compliance_status: true,
      },
      orderBy: { trading_name: "asc" },
    });

    const aggregates = await this.prisma.client.player_safety_aggregates.findMany({
      where: {
        county: normalizedCounty,
        bucket_date: { gte: since },
      },
      orderBy: { bucket_date: "asc" },
    });

    const playSafeTotal = aggregates.reduce(
      (sum, row) => sum + Number(row.play_safe_activations),
      0,
    );
    const selfExclusionTotal = aggregates.reduce(
      (sum, row) => sum + Number(row.self_exclusion_requests),
      0,
    );
    const sessionTotal = aggregates.reduce(
      (sum, row) => sum + Number(row.session_count),
      0,
    );

    const heatmap = emptyHourByDayMatrix();
    for (const row of aggregates) {
      this.mergeHeatmap(heatmap, row.hour_by_day_matrix as HourMatrix);
    }

    const stakeBands = this.emptyBands(STAKE_BANDS);
    const ageBands = this.emptyBands(AGE_BANDS);
    for (const row of aggregates) {
      this.mergeBands(
        stakeBands,
        row.stake_band_distribution as BandCounts,
      );
      this.mergeBands(
        ageBands,
        row.age_band_distribution as BandCounts,
      );
    }

    const ggrTotal = operators.reduce(
      (sum, op) => sum + Number(op.annual_ggr ?? 0),
      0,
    );

    return {
      county: normalizedCounty,
      days,
      operators,
      operator_count: operators.length,
      annual_ggr_total: ggrTotal,
      play_safe_activations: playSafeTotal,
      self_exclusion_requests: selfExclusionTotal,
      session_count: sessionTotal,
      peak_time_heatmap: heatmap,
      stake_band_distribution: stakeBands,
      age_band_distribution: ageBands,
      daily_trend: aggregates.map((row) => ({
        date: row.bucket_date.toISOString().slice(0, 10),
        play_safe_activations: Number(row.play_safe_activations),
        self_exclusion_requests: Number(row.self_exclusion_requests),
        session_count: Number(row.session_count),
      })),
      disclaimer:
        "Anonymised aggregate data only. No individual player identifiers are stored or exported.",
    };
  }

  async exportAnonymisedDataset(days = 30) {
    const since = this.daysAgo(days);
    const rows = await this.prisma.client.player_safety_aggregates.findMany({
      where: { bucket_date: { gte: since } },
      orderBy: [{ bucket_date: "asc" }, { county: "asc" }],
    });

    const headers = [
      "bucket_date",
      "county",
      "region",
      "play_safe_activations",
      "self_exclusion_requests",
      "session_count",
      "avg_session_minutes",
      "peak_hour",
      "stake_band_0_50",
      "stake_band_51_100",
      "stake_band_101_250",
      "stake_band_251_500",
      "stake_band_501_1000",
      "stake_band_1001_plus",
      "age_band_18_24",
      "age_band_25_34",
      "age_band_35_44",
      "age_band_45_54",
      "age_band_55_plus",
    ];

    const csvRows = rows.map((row) => {
      const bands = (row.stake_band_distribution as BandCounts) ?? {};
      const ages = (row.age_band_distribution as BandCounts) ?? {};
      return [
        row.bucket_date.toISOString().slice(0, 10),
        row.county,
        row.region ?? "",
        String(row.play_safe_activations),
        String(row.self_exclusion_requests),
        String(row.session_count),
        String(row.avg_session_minutes),
        row.peak_hour !== null ? String(row.peak_hour) : "",
        String(bands["0-50"] ?? 0),
        String(bands["51-100"] ?? 0),
        String(bands["101-250"] ?? 0),
        String(bands["251-500"] ?? 0),
        String(bands["501-1000"] ?? 0),
        String(bands["1001+"] ?? 0),
        String(ages["18-24"] ?? 0),
        String(ages["25-34"] ?? 0),
        String(ages["35-44"] ?? 0),
        String(ages["45-54"] ?? 0),
        String(ages["55+"] ?? 0),
      ];
    });

    const escape = (value: string) => {
      if (value.includes(",") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const lines = [
      headers.join(","),
      ...csvRows.map((row) => row.map(escape).join(",")),
    ];

    const filename = `gra-regional-anonymised-${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      filename,
      mime_type: "text/csv",
      buffer: Buffer.from(lines.join("\n"), "utf-8"),
    };
  }

  private async getCountyCommercial() {
    const operators = await this.prisma.client.operators.findMany({
      where: { status: "active" },
      select: {
        county: true,
        region: true,
        annual_ggr: true,
      },
    });

    const byCounty = new Map<
      string,
      { region: string | null; operator_count: number; annual_ggr: number }
    >();

    for (const op of operators) {
      const county = op.county ?? "Unknown";
      const entry = byCounty.get(county) ?? {
        region: op.region,
        operator_count: 0,
        annual_ggr: 0,
      };
      entry.operator_count += 1;
      entry.annual_ggr += Number(op.annual_ggr ?? 0);
      if (!entry.region && op.region) {
        entry.region = op.region;
      }
      byCounty.set(county, entry);
    }

    return [...byCounty.entries()]
      .map(([county, data]) => ({
        county,
        region: data.region,
        operator_count: data.operator_count,
        annual_ggr: data.annual_ggr,
      }))
      .sort((a, b) => b.annual_ggr - a.annual_ggr);
  }

  private async getSafetyByCounty(since: Date) {
    const aggregates = await this.prisma.client.player_safety_aggregates.findMany({
      where: { bucket_date: { gte: since } },
    });

    const playSafe = new Map<string, number>();
    const selfExclusion = new Map<string, number>();

    for (const row of aggregates) {
      playSafe.set(
        row.county,
        (playSafe.get(row.county) ?? 0) + Number(row.play_safe_activations),
      );
      selfExclusion.set(
        row.county,
        (selfExclusion.get(row.county) ?? 0) +
          Number(row.self_exclusion_requests),
      );
    }

    return {
      play_safe_by_county: [...playSafe.entries()]
        .map(([county, count]) => ({ county, count }))
        .sort((a, b) => b.count - a.count),
      self_exclusion_by_county: [...selfExclusion.entries()]
        .map(([county, count]) => ({ county, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  private async getNationalHeatmap(since: Date) {
    const aggregates = await this.prisma.client.player_safety_aggregates.findMany({
      where: { bucket_date: { gte: since } },
      select: { hour_by_day_matrix: true },
    });

    const matrix = emptyHourByDayMatrix();
    for (const row of aggregates) {
      this.mergeHeatmap(matrix, row.hour_by_day_matrix as HourMatrix);
    }

    return {
      matrix,
      day_labels: DAY_LABELS,
      hours: Array.from({ length: 24 }, (_, i) => i),
    };
  }

  private async getNationalStakeBands(since: Date) {
    const aggregates = await this.prisma.client.player_safety_aggregates.findMany({
      where: { bucket_date: { gte: since } },
      select: { stake_band_distribution: true },
    });

    const totals = this.emptyBands(STAKE_BANDS);
    for (const row of aggregates) {
      this.mergeBands(
        totals,
        row.stake_band_distribution as BandCounts,
      );
    }

    return STAKE_BANDS.map((band) => ({
      band,
      count: totals[band] ?? 0,
    }));
  }

  private async getNationalAgeBands(since: Date) {
    const aggregates = await this.prisma.client.player_safety_aggregates.findMany({
      where: { bucket_date: { gte: since } },
      select: { age_band_distribution: true },
    });

    const totals = this.emptyBands(AGE_BANDS);
    for (const row of aggregates) {
      this.mergeBands(
        totals,
        row.age_band_distribution as BandCounts,
      );
    }

    return AGE_BANDS.map((band) => ({
      band,
      count: totals[band] ?? 0,
    }));
  }

  private mergeHeatmap(target: HourMatrix, source: HourMatrix | null) {
    if (!source) return;
    for (const [day, hours] of Object.entries(source)) {
      if (!target[day]) {
        target[day] = Array.from({ length: 24 }, () => 0);
      }
      for (let hour = 0; hour < 24; hour += 1) {
        target[day][hour] += Number(hours[hour] ?? 0);
      }
    }
  }

  private mergeBands(target: BandCounts, source: BandCounts | null) {
    if (!source) return;
    for (const [band, count] of Object.entries(source)) {
      target[band] = (target[band] ?? 0) + Number(count);
    }
  }

  private emptyBands(bands: readonly string[]): BandCounts {
    const result: BandCounts = {};
    for (const band of bands) {
      result[band] = 0;
    }
    return result;
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
