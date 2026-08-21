"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { formatKsh } from "@/lib/utils";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { EmptyState } from "@/components/empty-state";
import type { ComplianceOverview } from "@/lib/api";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALERTS_PANEL_HEIGHT = "max-h-96";

type CalendarDay = {
  date: number;
  isCurrentMonth: boolean;
  dateKey: string;
  events: ComplianceOverview["upcoming_deadlines"];
};

function buildCalendarDays(
  year: number,
  month: number,
  deadlines: ComplianceOverview["upcoming_deadlines"],
): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const days: CalendarDay[] = [];

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const date = prevMonthDays - i;
    const dateKey = toDateKey(new Date(year, month - 1, date));
    days.push({ date, isCurrentMonth: false, dateKey, events: eventsForDate(deadlines, dateKey) });
  }

  for (let date = 1; date <= daysInMonth; date++) {
    const dateKey = toDateKey(new Date(year, month, date));
    days.push({ date, isCurrentMonth: true, dateKey, events: eventsForDate(deadlines, dateKey) });
  }

  const trailing = 42 - days.length;
  for (let date = 1; date <= trailing; date++) {
    const dateKey = toDateKey(new Date(year, month + 1, date));
    days.push({ date, isCurrentMonth: false, dateKey, events: eventsForDate(deadlines, dateKey) });
  }

  return days;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function eventsForDate(
  deadlines: ComplianceOverview["upcoming_deadlines"],
  dateKey: string,
) {
  return deadlines.filter((event) => event.due_date === dateKey);
}

function deadlineLabel(event: ComplianceOverview["upcoming_deadlines"][number]) {
  if (event.status === "due_today") return "Due today";
  if (event.status === "overdue") return "Overdue";
  return new Date(event.due_date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

function eventTypeLabel(type: string) {
  switch (type) {
    case "monthly_return":
      return "Monthly return";
    case "licence_renewal":
      return "Licence renewal";
    case "submission_review":
      return "Submission review";
    default:
      return type;
  }
}

function AlertPanelCard({
  children,
  header,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      {header}
      <CardContent className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", ALERTS_PANEL_HEIGHT)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function ComplianceCalendarSection({ data }: { data: ComplianceOverview }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const calendarDays = useMemo(
    () => buildCalendarDays(viewDate.getFullYear(), viewDate.getMonth(), data.upcoming_deadlines),
    [viewDate, data.upcoming_deadlines],
  );

  const upcomingWindow = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    return data.upcoming_deadlines
      .filter((event) => {
        const due = new Date(event.due_date);
        return due >= today && due <= in30;
      })
      .slice(0, 8);
  }, [data.upcoming_deadlines]);

  const todayKey = toDateKey(new Date());

  function shiftMonth(delta: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function handleDayClick(day: CalendarDay) {
    if (day.events.length === 0) return;
    setSelectedDay(day);
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px text-center">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2 text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border">
              {calendarDays.map((day, index) => (
                <button
                  key={`${day.dateKey}-${index}`}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={day.events.length === 0}
                  className={cn(
                    "min-h-[80px] bg-card p-2 text-left transition-colors",
                    !day.isCurrentMonth && "bg-secondary/30",
                    day.events.length > 0 && "cursor-pointer hover:bg-secondary/50",
                    day.events.length === 0 && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm",
                      !day.isCurrentMonth && "text-muted-foreground/50",
                      day.dateKey === todayKey &&
                        day.isCurrentMonth &&
                        "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground",
                    )}
                  >
                    {day.date}
                  </span>
                  {day.events.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {day.events.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-[10px]",
                            event.status === "due_today" || event.status === "overdue"
                              ? "bg-danger/20 text-danger"
                              : "bg-primary/15 text-primary",
                          )}
                          title={event.title}
                        >
                          {eventTypeLabel(event.type)}
                        </div>
                      ))}
                      {day.events.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{day.events.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingWindow.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-5 w-5" />}
                title="No upcoming deadlines"
                description="No filing or licence deadlines in the next 30 days."
                className="py-6"
              />
            ) : (
              upcomingWindow.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "rounded-lg border p-3",
                    event.status === "due_today"
                      ? "border-danger bg-danger/5"
                      : "border-border bg-secondary/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">{event.title}</p>
                      {event.operator_name && event.operator_external_id ? (
                        <Link
                          href={`/operators/${event.operator_external_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {event.operator_name}
                        </Link>
                      ) : null}
                    </div>
                    <Badge
                      variant={
                        event.status === "due_today" || event.status === "overdue"
                          ? "danger"
                          : "muted"
                      }
                      size="sm"
                    >
                      {deadlineLabel(event)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {selectedDay ? formatDateKey(selectedDay.dateKey) : "Deadlines"}
            </DialogTitle>
            <DialogDescription>
              {selectedDay
                ? `${selectedDay.events.length} deadline${selectedDay.events.length === 1 ? "" : "s"} on this date`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-6">
            {selectedDay?.events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-secondary/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {eventTypeLabel(event.type)}
                    </p>
                    {event.operator_name && event.operator_external_id ? (
                      <Link
                        href={`/operators/${event.operator_external_id}`}
                        className="text-xs text-primary hover:underline"
                        onClick={() => setSelectedDay(null)}
                      >
                        {event.operator_name}
                      </Link>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      event.status === "due_today" || event.status === "overdue"
                        ? "danger"
                        : "muted"
                    }
                    size="sm"
                  >
                    {deadlineLabel(event)}
                  </Badge>
                </div>
              </div>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ComplianceAlertsSection({ data }: { data: ComplianceOverview }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
      <AlertPanelCard
        header={
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              <CardTitle className="text-base">Overdue Filings</CardTitle>
            </div>
            <CardDescription>Operators missing returns past their due date</CardDescription>
          </CardHeader>
        }
      >
        {data.overdue_filings.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No overdue filings"
            description="All operators are current with their filings."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {data.overdue_filings.map((op) => (
              <li key={op.operator_external_id}>
                <Link
                  href={`/operators/${op.operator_external_id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{op.operator_name}</p>
                    <p className="text-xs text-muted-foreground">{op.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Last submission:{" "}
                      {op.last_submission_at
                        ? new Date(op.last_submission_at).toLocaleDateString("en-KE")
                        : "Never"}
                    </p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    {op.days_overdue !== null && op.days_overdue > 0 && (
                      <Badge variant="danger" size="sm">
                        {op.days_overdue}d overdue
                      </Badge>
                    )}
                    <Badge variant={complianceBadgeVariant(op.compliance_status)} size="sm">
                      {complianceLabel(op.compliance_status)}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AlertPanelCard>

      <AlertPanelCard
        header={
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-warning" />
              <CardTitle className="text-base">Pending Review</CardTitle>
            </div>
            <CardDescription>Submissions awaiting staff review</CardDescription>
          </CardHeader>
        }
      >
        {data.pending_reviews.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="No pending reviews"
            description="All submitted returns have been reviewed."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {data.pending_reviews.map((submission) => {
              const taxOutstanding = Number(submission.tax_outstanding);
              return (
                <li key={submission.id}>
                  <Link
                    href={`/operators/${submission.operator_external_id}?tab=submissions`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{submission.operator_name}</p>
                      <p className="text-xs text-muted-foreground">{submission.period}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleDateString("en-KE")
                          : "—"}
                      </p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      {taxOutstanding > 0 && (
                        <p className="text-xs font-medium tabular-nums">
                          {formatKsh(submission.tax_outstanding)}
                        </p>
                      )}
                      <Badge
                        variant={submission.is_overdue ? "danger" : "warning"}
                        size="sm"
                      >
                        {submission.is_overdue ? "Review overdue" : "Awaiting review"}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </AlertPanelCard>

      <AlertPanelCard
        header={
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <CardTitle className="text-base">Expiring Licences</CardTitle>
            </div>
            <CardDescription>Licences expiring within 90 days</CardDescription>
          </CardHeader>
        }
      >
        {data.expiring_licences.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No licences expiring soon"
            description="All active licences are valid beyond 90 days."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {data.expiring_licences.map((licence) => (
              <li key={licence.operator_external_id}>
                <Link
                  href={`/operators/${licence.operator_external_id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{licence.operator_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(licence.expires_at).toLocaleDateString("en-KE")}
                    </p>
                  </div>
                  <Badge
                    variant={licence.days_remaining <= 30 ? "danger" : "warning"}
                    size="sm"
                  >
                    {licence.days_remaining} days
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AlertPanelCard>
    </div>
  );
}
