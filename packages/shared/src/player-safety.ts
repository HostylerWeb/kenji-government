import { z } from "zod";

const isoDateTime = z.coerce.date();

export const PLAYER_SAFETY_FORBIDDEN_KEYS = [
  "player_id",
  "user_id",
  "customer_id",
  "punter_id",
  "account_id",
  "email",
  "phone",
  "mobile",
  "name",
  "full_name",
  "first_name",
  "last_name",
  "national_id",
  "passport",
  "ip_address",
  "device_id",
  "fingerprint",
  "payer_fingerprint",
] as const;

export const STAKE_BANDS = [
  "0-50",
  "51-100",
  "101-250",
  "251-500",
  "501-1000",
  "1001+",
] as const;

/** Anonymised age buckets only — never raw birth dates or exact ages. */
export const AGE_BANDS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55+",
] as const;

export const playerSafetyEventTypeSchema = z.enum([
  "play_safe",
  "self_exclusion",
]);

export const playerSafetyEventSchema = z.object({
  event_type: playerSafetyEventTypeSchema,
  county: z.string().min(1).max(64),
  region: z.string().max(64).optional(),
  occurred_at: isoDateTime,
  hour_of_day: z.number().int().min(0).max(23).optional(),
  day_of_week: z.number().int().min(0).max(6).optional(),
});

export const sessionAggregateSchema = z.object({
  county: z.string().min(1).max(64),
  region: z.string().max(64).optional(),
  bucket_start: isoDateTime,
  session_count: z.number().int().nonnegative(),
  total_session_minutes: z.number().int().nonnegative(),
  stake_band_distribution: z
    .record(z.string(), z.number().int().nonnegative())
    .default({}),
  age_band_distribution: z
    .record(z.string(), z.number().int().nonnegative())
    .default({}),
  day_of_week: z.number().int().min(0).max(6).optional(),
  hour_of_day: z.number().int().min(0).max(23).optional(),
});

export type PlayerSafetyEventInput = z.infer<typeof playerSafetyEventSchema>;
export type SessionAggregateInput = z.infer<typeof sessionAggregateSchema>;

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function containsForbiddenPii(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = containsForbiddenPii(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase().replace(/[-_]/g, "");
      for (const forbidden of PLAYER_SAFETY_FORBIDDEN_KEYS) {
        const forbiddenNorm = forbidden.replace(/[-_]/g, "");
        if (
          normalized === forbiddenNorm ||
          normalized.endsWith(forbiddenNorm) ||
          normalized.includes(forbiddenNorm)
        ) {
          return key;
        }
      }
      const nestedFound = containsForbiddenPii(nested);
      if (nestedFound) return nestedFound;
    }
  }

  return null;
}

export function deriveHourAndDay(
  date: Date,
  hourOfDay?: number,
  dayOfWeek?: number,
): { hour_of_day: number; day_of_week: number } {
  return {
    hour_of_day:
      hourOfDay !== undefined ? hourOfDay : date.getUTCHours(),
    day_of_week:
      dayOfWeek !== undefined ? dayOfWeek : date.getUTCDay(),
  };
}

export function emptyHourByDayMatrix(): Record<string, number[]> {
  const matrix: Record<string, number[]> = {};
  for (let day = 0; day < 7; day += 1) {
    matrix[String(day)] = Array.from({ length: 24 }, () => 0);
  }
  return matrix;
}
