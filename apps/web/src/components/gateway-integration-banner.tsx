"use client";

import { Card } from "@/components/card";

export function GatewayIntegrationBanner() {
  return (
    <Card className="mb-6 border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-medium text-foreground">
        Government oversight receiver — not the payment gateway
      </p>
      <p className="mt-1 text-sm text-muted">
        Raffle operators charge customers through the{" "}
        <strong className="font-medium text-foreground">payment gateway</strong>{" "}
        (separate service). The gateway splits tax, holds escrow, and notifies
        GRA via{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-xs">
          POST /v1/gateway/notify
        </code>
        . This console only records and monitors those notifications.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span className="rounded-full bg-secondary px-2 py-0.5">
          Raffle site → Gateway
        </span>
        <span>→</span>
        <span className="rounded-full bg-secondary px-2 py-0.5">
          Gateway → GRA ingest
        </span>
        <span>→</span>
        <span className="rounded-full bg-secondary px-2 py-0.5">
          GRA staff console
        </span>
      </div>
    </Card>
  );
}
