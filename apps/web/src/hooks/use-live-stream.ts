"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveFeedEvent } from "@kenji-government/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useLiveStream(
  token: string | null,
  operatorExternalId?: string,
) {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    if (!token) return;

    const params = new URLSearchParams({ access_token: token });
    if (operatorExternalId) {
      params.set("operator_external_id", operatorExternalId);
    }

    const source = new EventSource(
      `${API_URL}/live/stream?${params.toString()}`,
    );

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as LiveFeedEvent;
        if (seenIds.current.has(event.id)) return;
        seenIds.current.add(event.id);
        setEvents((prev) => [event, ...prev].slice(0, 50));
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [token, operatorExternalId]);

  return { events, connected };
}
