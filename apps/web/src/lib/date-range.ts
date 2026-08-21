export const EAT_TIMEZONE = "Africa/Nairobi";

export type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "custom";

export type DateRange = {
  from: string;
  to: string;
  label: string;
};

const PRESET_LABELS: Record<Exclude<DatePreset, "custom">, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
};

function formatEatDate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: EAT_TIMEZONE });
}

function parseEatDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateStr: string, days: number): string {
  const date = parseEatDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfWeekEat(today: string): string {
  const date = parseEatDate(today);
  const weekday = date.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function resolveDateRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const today = formatEatDate(new Date());

  if (preset === "custom") {
    const from = customFrom || today;
    const to = customTo || from;
    const safeTo = to < from ? from : to;
    return {
      from,
      to: safeTo,
      label:
        from === safeTo
          ? formatDisplayDate(from)
          : `${formatDisplayDate(from)} – ${formatDisplayDate(safeTo)}`,
    };
  }

  switch (preset) {
    case "today":
      return { from: today, to: today, label: PRESET_LABELS.today };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { from: yesterday, to: yesterday, label: PRESET_LABELS.yesterday };
    }
    case "this_week":
      return {
        from: startOfWeekEat(today),
        to: today,
        label: PRESET_LABELS.this_week,
      };
    case "this_month": {
      const [year, month] = today.split("-");
      return {
        from: `${year}-${month}-01`,
        to: today,
        label: PRESET_LABELS.this_month,
      };
    }
    default:
      return resolveDateRange("this_month");
  }
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseEatDate(dateStr);
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
