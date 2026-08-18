"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import { getEnforcementCases, type EnforcementCase } from "@/lib/api";

export default function EnforcementPage() {
  const { user, token } = useAuth();
  const [status, setStatus] = useState("open");
  const [cases, setCases] = useState<EnforcementCase[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getEnforcementCases(token, { status })
      .then(setCases)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, status]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Enforcement Centre">
      <Card className="mb-6">
        <div className="flex gap-2">
          {["open", "escalated", "resolved", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                status === s
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="space-y-4">
        {cases.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No cases in this status.</p>
          </Card>
        ) : (
          cases.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{c.case_number}</span>
                <Badge variant="muted">{c.status}</Badge>
                <Badge variant="warning">{c.case_type}</Badge>
              </div>
              <h3 className="mt-2 font-semibold">
                <Link href={`/enforcement/${c.id}`} className="hover:text-primary">
                  {c.title}
                </Link>
              </h3>
              {c.description && (
                <p className="mt-1 text-sm text-muted">{c.description}</p>
              )}
              {c.operator && (
                <Link
                  href={`/operators/${c.operator.external_id}`}
                  className="mt-2 block text-sm text-primary hover:underline"
                >
                  {c.operator.trading_name}
                </Link>
              )}
              {c.actions && c.actions.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted">
                  {c.actions.map((a) => (
                    <li key={a.id}>
                      {new Date(a.created_at).toLocaleDateString("en-KE")} —{" "}
                      {a.action_type}: {a.details}
                      {a.performer && ` (${a.performer.full_name})`}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
