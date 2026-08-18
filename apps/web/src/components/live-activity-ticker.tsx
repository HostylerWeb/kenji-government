"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import type { LiveFeedEvent } from "@kenji-government/shared";
import { formatKsh } from "@/lib/utils";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

export function LiveActivityTicker({
  events,
  connected,
  showOperator = true,
}: {
  events: LiveFeedEvent[];
  connected: boolean;
  showOperator?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Radio
          className={`h-4 w-4 ${connected ? "text-success animate-pulse" : "text-muted"}`}
        />
        <span className="font-medium">Live activity</span>
        <span className="text-muted">
          {connected ? "Connected" : "Reconnecting…"}
        </span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted">
          Waiting for ticket purchases and payments…
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2"
            >
              <span className="font-mono text-xs text-muted">
                {formatTime(event.occurred_at)}
              </span>
              {showOperator && event.operator_external_id && (
                <Link
                  href={`/operators/${event.operator_external_id}`}
                  className="font-medium hover:text-primary"
                >
                  {event.operator_name}
                </Link>
              )}
              <span>{event.summary}</span>
              {event.amount && (
                <span className="text-muted">{formatKsh(event.amount)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
