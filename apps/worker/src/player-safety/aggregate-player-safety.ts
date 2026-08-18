import type { PrismaClient } from "@prisma/client";
import {
  AGE_BANDS,
  emptyHourByDayMatrix,
  STAKE_BANDS,
} from "@kenji-government/shared";

type BandCounts = Record<string, number>;
type HourMatrix = Record<string, number[]>;

export async function aggregatePlayerSafetyForDate(
  prisma: PrismaClient,
  bucketDate: Date,
) {
  const start = new Date(bucketDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const safetyEvents = await prisma.player_safety_events.findMany({
    where: {
      occurred_at: { gte: start, lt: end },
    },
  });

  const sessionEvents = await prisma.session_aggregate_events.findMany({
    where: {
      bucket_start: { gte: start, lt: end },
    },
  });

  const counties = new Set<string>();
  for (const event of safetyEvents) counties.add(event.county);
  for (const event of sessionEvents) counties.add(event.county);

  if (counties.size === 0) {
    return { counties_processed: 0, bucket_date: start.toISOString().slice(0, 10) };
  }

  const reportingPeriod = await prisma.reporting_periods.findFirst({
    where: {
      year: start.getUTCFullYear(),
      month: start.getUTCMonth() + 1,
    },
  });

  let processed = 0;

  for (const county of counties) {
    const countySafety = safetyEvents.filter((e) => e.county === county);
    const countySessions = sessionEvents.filter((e) => e.county === county);

    const playSafe = countySafety.filter((e) => e.event_type === "play_safe").length;
    const selfExclusion = countySafety.filter(
      (e) => e.event_type === "self_exclusion",
    ).length;

    let sessionCount = 0;
    let totalMinutes = 0;
    const stakeBands = emptyBands(STAKE_BANDS);
    const ageBands = emptyBands(AGE_BANDS);
    const heatmap = emptyHourByDayMatrix();

    for (const session of countySessions) {
      sessionCount += Number(session.session_count);
      totalMinutes += Number(session.total_session_minutes);
      mergeBands(
        stakeBands,
        session.stake_band_distribution as BandCounts,
      );
      mergeBands(
        ageBands,
        session.age_band_distribution as BandCounts,
      );
      const dayKey = String(session.day_of_week);
      if (!heatmap[dayKey]) {
        heatmap[dayKey] = Array.from({ length: 24 }, () => 0);
      }
      heatmap[dayKey][session.hour_of_day] += Number(session.session_count);
    }

    for (const event of countySafety) {
      const dayKey = String(event.day_of_week);
      if (!heatmap[dayKey]) {
        heatmap[dayKey] = Array.from({ length: 24 }, () => 0);
      }
      heatmap[dayKey][event.hour_of_day] += 1;
    }

    const peakHour = findPeakHour(heatmap);
    const avgSessionMinutes =
      sessionCount > 0 ? totalMinutes / sessionCount : 0;

    const region =
      countySafety.find((e) => e.region)?.region ??
      countySessions.find((e) => e.region)?.region ??
      null;

    await prisma.player_safety_aggregates.upsert({
      where: {
        bucket_date_county: {
          bucket_date: start,
          county,
        },
      },
      create: {
        reporting_period_id: reportingPeriod?.id,
        bucket_date: start,
        county,
        region,
        play_safe_activations: playSafe,
        self_exclusion_requests: selfExclusion,
        session_count: sessionCount,
        avg_session_minutes: avgSessionMinutes,
        peak_hour: peakHour,
        stake_band_distribution: stakeBands,
        age_band_distribution: ageBands,
        hour_by_day_matrix: heatmap,
      },
      update: {
        reporting_period_id: reportingPeriod?.id,
        region,
        play_safe_activations: playSafe,
        self_exclusion_requests: selfExclusion,
        session_count: sessionCount,
        avg_session_minutes: avgSessionMinutes,
        peak_hour: peakHour,
        stake_band_distribution: stakeBands,
        age_band_distribution: ageBands,
        hour_by_day_matrix: heatmap,
      },
    });

    processed += 1;
  }

  return {
    counties_processed: processed,
    bucket_date: start.toISOString().slice(0, 10),
  };
}

export async function aggregatePlayerSafetyRange(
  prisma: PrismaClient,
  daysBack = 1,
) {
  const results = [];
  for (let offset = daysBack; offset >= 1; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    date.setUTCHours(0, 0, 0, 0);
    results.push(await aggregatePlayerSafetyForDate(prisma, date));
  }
  return results;
}

function emptyBands(bands: readonly string[]): BandCounts {
  const result: BandCounts = {};
  for (const band of bands) {
    result[band] = 0;
  }
  return result;
}

function mergeBands(target: BandCounts, source: BandCounts | null) {
  if (!source) return;
  for (const [band, count] of Object.entries(source)) {
    target[band] = (target[band] ?? 0) + Number(count);
  }
}

function findPeakHour(matrix: HourMatrix): number | null {
  let peakHour: number | null = null;
  let peakValue = 0;

  for (const hours of Object.values(matrix)) {
    for (let hour = 0; hour < 24; hour += 1) {
      const value = Number(hours[hour] ?? 0);
      if (value > peakValue) {
        peakValue = value;
        peakHour = hour;
      }
    }
  }

  return peakValue > 0 ? peakHour : null;
}
