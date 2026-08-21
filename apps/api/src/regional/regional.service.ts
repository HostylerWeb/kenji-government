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
    const countyPerformance = await this.buildCountyPerformance(counties, days);
    const nationalSummary = await this.getNationalSummary(days, counties, countyPerformance);

    return {
      days,
      national_summary: nationalSummary,
      county_performance: countyPerformance,
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

    const growth = await this.getCountyGrowthMetrics(normalizedCounty, days);

    return {
      county: normalizedCounty,
      days,
      operators,
      operator_count: operators.length,
      annual_ggr_total: ggrTotal,
      play_safe_activations: playSafeTotal,
      self_exclusion_requests: selfExclusionTotal,
      session_count: sessionTotal,
      sessions_change_pct: growth.sessions_change_pct,
      sessions_ytd_change_pct: growth.sessions_ytd_change_pct,
      play_safe_change_pct: growth.play_safe_change_pct,
      self_exclusion_change_pct: growth.self_exclusion_change_pct,
      ggr_ytd: growth.ggr_ytd,
      ggr_ytd_change_pct: growth.ggr_ytd_change_pct,
      ggr_ytd_change_label: growth.ggr_ytd_change_label,
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

  private percentChange(previous: number, current: number): number | null {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private async sumSessions(from: Date, to?: Date, county?: string) {
    const where: Prisma.player_safety_aggregatesWhereInput = {
      bucket_date: to ? { gte: from, lt: to } : { gte: from },
    };
    if (county) where.county = county;
    const result = await this.prisma.client.player_safety_aggregates.aggregate({
      where,
      _sum: { session_count: true },
    });
    return Number(result._sum.session_count ?? 0);
  }

  private async getGgrGrowthSummary(county?: string) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const [ggrYtd, ggrYtdPrior, ggrRecent, ggrRecentPrior] = await Promise.all([
      this.sumSnapshotGgr({ year, monthFrom: 1, monthTo: month, county }),
      this.sumSnapshotGgr({ year: year - 1, monthFrom: 1, monthTo: month, county }),
      this.sumSnapshotGgrForRecentMonths(3, county),
      this.sumSnapshotGgrForRecentMonths(3, county, 3),
    ]);

    return {
      ggr_ytd: ggrYtd,
      ggr_ytd_change_pct: this.percentChange(ggrYtdPrior, ggrYtd),
      ggr_ytd_change_label: "YTD vs same period last year",
      ggr_recent_change_pct: this.percentChange(ggrRecentPrior, ggrRecent),
      ggr_recent_change_label: "vs prior 3 reporting months",
    };
  }

  private async getCountyGrowthMetrics(county: string, days: number) {
    const now = new Date();
    const currentSince = this.daysAgo(days);
    const priorSince = this.daysAgo(days * 2);
    const ytdStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const priorYtdStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const priorYtdEnd = new Date(
      Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate() + 1),
    );

    const aggregates = await this.prisma.client.player_safety_aggregates.findMany({
      where: {
        county,
        bucket_date: { gte: priorSince },
      },
      select: {
        bucket_date: true,
        session_count: true,
        play_safe_activations: true,
        self_exclusion_requests: true,
      },
    });

    let currentSessions = 0;
    let priorSessions = 0;
    let currentPlaySafe = 0;
    let priorPlaySafe = 0;
    let currentSelfExclusion = 0;
    let priorSelfExclusion = 0;

    for (const row of aggregates) {
      const isCurrent = row.bucket_date >= currentSince;
      const sessions = Number(row.session_count);
      const playSafe = Number(row.play_safe_activations);
      const selfExclusion = Number(row.self_exclusion_requests);
      if (isCurrent) {
        currentSessions += sessions;
        currentPlaySafe += playSafe;
        currentSelfExclusion += selfExclusion;
      } else {
        priorSessions += sessions;
        priorPlaySafe += playSafe;
        priorSelfExclusion += selfExclusion;
      }
    }

    const [ytdSessions, priorYtdSessions, ggrGrowth] = await Promise.all([
      this.sumSessions(ytdStart, undefined, county),
      this.sumSessions(priorYtdStart, priorYtdEnd, county),
      this.getGgrGrowthSummary(county),
    ]);

    return {
      sessions_change_pct: this.percentChange(priorSessions, currentSessions),
      sessions_ytd_change_pct: this.percentChange(priorYtdSessions, ytdSessions),
      play_safe_change_pct: this.percentChange(priorPlaySafe, currentPlaySafe),
      self_exclusion_change_pct: this.percentChange(
        priorSelfExclusion,
        currentSelfExclusion,
      ),
      ggr_ytd: ggrGrowth.ggr_ytd,
      ggr_ytd_change_pct: ggrGrowth.ggr_ytd_change_pct,
      ggr_ytd_change_label: ggrGrowth.ggr_ytd_change_label,
    };
  }

  private async sumSnapshotGgr(params: {
    year: number;
    monthFrom: number;
    monthTo: number;
    county?: string;
  }) {
    const snapshots = await this.prisma.client.operator_monthly_snapshots.findMany({
      where: {
        reporting_period: {
          year: params.year,
          month: { gte: params.monthFrom, lte: params.monthTo },
        },
        ...(params.county
          ? { operator: { county: params.county, status: "active" } }
          : { operator: { status: "active" } }),
      },
      select: { gross_gaming_revenue: true },
    });

    return snapshots.reduce(
      (sum, row) => sum + Number(row.gross_gaming_revenue),
      0,
    );
  }

  private async sumSnapshotGgrForRecentMonths(
    count: number,
    county?: string,
    skip = 0,
  ) {
    const periods = await this.prisma.client.reporting_periods.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: count + skip,
    });
    const selected = periods.slice(skip, skip + count);
    if (selected.length === 0) return 0;

    const snapshots = await this.prisma.client.operator_monthly_snapshots.findMany({
      where: {
        reporting_period_id: { in: selected.map((period) => period.id) },
        ...(county
          ? { operator: { county, status: "active" } }
          : { operator: { status: "active" } }),
      },
      select: { gross_gaming_revenue: true },
    });

    return snapshots.reduce(
      (sum, row) => sum + Number(row.gross_gaming_revenue),
      0,
    );
  }

  private async getNationalSummary(
    days: number,
    counties: Array<{ county: string; annual_ggr: number }>,
    countyPerformance: Array<{
      county: string;
      sessions_change_pct: number | null;
    }>,
  ) {
    const now = new Date();
    const currentSince = this.daysAgo(days);
    const priorSince = this.daysAgo(days * 2);

    const ytdStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const priorYtdStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    const priorYtdEnd = new Date(
      Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate() + 1),
    );

    const [currentSessions, priorSessions, ytdSessions, priorYtdSessions, ggrGrowth] =
      await Promise.all([
        this.sumSessions(currentSince),
        this.sumSessions(priorSince, currentSince),
        this.sumSessions(ytdStart),
        this.sumSessions(priorYtdStart, priorYtdEnd),
        this.getGgrGrowthSummary(),
      ]);

    const totalGgr = counties.reduce((sum, row) => sum + row.annual_ggr, 0);
    const activeCounties = counties.filter((row) => row.county !== "Unknown").length;

    const highestGrowth = [...countyPerformance]
      .filter((row) => row.sessions_change_pct !== null)
      .sort((a, b) => (b.sessions_change_pct ?? 0) - (a.sessions_change_pct ?? 0))[0];

    return {
      total_sessions: currentSessions,
      sessions_change_pct: this.percentChange(priorSessions, currentSessions),
      sessions_change_label: `vs prior ${days} days`,
      total_sessions_ytd: ytdSessions,
      sessions_ytd_change_pct: this.percentChange(priorYtdSessions, ytdSessions),
      sessions_ytd_change_label: "YTD vs same period last year",
      total_annual_ggr: totalGgr,
      ggr_ytd: ggrGrowth.ggr_ytd,
      ggr_ytd_change_pct: ggrGrowth.ggr_ytd_change_pct,
      ggr_ytd_change_label: ggrGrowth.ggr_ytd_change_label,
      ggr_recent_change_pct: ggrGrowth.ggr_recent_change_pct,
      ggr_recent_change_label: ggrGrowth.ggr_recent_change_label,
      active_counties: activeCounties,
      total_counties: 47,
      highest_growth_county: highestGrowth
        ? {
            county: highestGrowth.county,
            change_pct: highestGrowth.sessions_change_pct,
            metric: "player sessions",
          }
        : null,
    };
  }

  private async buildCountyPerformance(
    commercial: Array<{
      county: string;
      region: string | null;
      operator_count: number;
      annual_ggr: number;
    }>,
    days: number,
  ) {
    const currentSince = this.daysAgo(days);
    const priorSince = this.daysAgo(days * 2);

    const aggregates = await this.prisma.client.player_safety_aggregates.findMany({
      where: { bucket_date: { gte: priorSince } },
      select: {
        county: true,
        bucket_date: true,
        session_count: true,
        play_safe_activations: true,
      },
    });

    const currentByCounty = new Map<string, { sessions: number; play_safe: number }>();
    const priorByCounty = new Map<string, { sessions: number; play_safe: number }>();

    for (const row of aggregates) {
      const target =
        row.bucket_date >= currentSince ? currentByCounty : priorByCounty;
      const entry = target.get(row.county) ?? { sessions: 0, play_safe: 0 };
      entry.sessions += Number(row.session_count);
      entry.play_safe += Number(row.play_safe_activations);
      target.set(row.county, entry);
    }

    const ggrChangeByCounty = await this.getCountyGgrYtdChanges();

    return commercial
      .map((row) => {
        const current = currentByCounty.get(row.county) ?? {
          sessions: 0,
          play_safe: 0,
        };
        const prior = priorByCounty.get(row.county) ?? { sessions: 0, play_safe: 0 };
        const ggrChange = ggrChangeByCounty.get(row.county);
        return {
          county: row.county,
          region: row.region,
          operator_count: row.operator_count,
          annual_ggr: row.annual_ggr,
          sessions: current.sessions,
          play_safe: current.play_safe,
          sessions_change_pct: this.percentChange(prior.sessions, current.sessions),
          play_safe_change_pct: this.percentChange(prior.play_safe, current.play_safe),
          ggr_ytd_change_pct: ggrChange?.change_pct ?? null,
        };
      })
      .sort((a, b) => b.annual_ggr - a.annual_ggr);
  }

  private async getCountyGgrYtdChanges() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const snapshots = await this.prisma.client.operator_monthly_snapshots.findMany({
      where: {
        reporting_period: {
          OR: [
            { year, month: { gte: 1, lte: month } },
            { year: year - 1, month: { gte: 1, lte: month } },
          ],
        },
        operator: { status: "active" },
      },
      select: {
        gross_gaming_revenue: true,
        operator: { select: { county: true } },
        reporting_period: { select: { year: true } },
      },
    });

    const currentByCounty = new Map<string, number>();
    const priorByCounty = new Map<string, number>();

    for (const row of snapshots) {
      const county = row.operator.county ?? "Unknown";
      const target =
        row.reporting_period.year === year ? currentByCounty : priorByCounty;
      target.set(
        county,
        (target.get(county) ?? 0) + Number(row.gross_gaming_revenue),
      );
    }

    const result = new Map<string, { change_pct: number | null }>();
    for (const county of new Set([...currentByCounty.keys(), ...priorByCounty.keys()])) {
      result.set(county, {
        change_pct: this.percentChange(
          priorByCounty.get(county) ?? 0,
          currentByCounty.get(county) ?? 0,
        ),
      });
    }
    return result;
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
