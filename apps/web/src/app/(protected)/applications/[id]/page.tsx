"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { useAuth } from "@/lib/use-auth";
import {
  approveOperatorApplication,
  getOperatorApplication,
  rejectOperatorApplication,
  type OperatorApplicationDetail,
} from "@/lib/api";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [application, setApplication] = useState<OperatorApplicationDetail | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) return;
    const data = await getOperatorApplication(token, params.id);
    setApplication(data);
  }

  useEffect(() => {
    load().catch(() => router.replace("/applications"));
  }, [token, params.id, router]);

  async function onApprove() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      await approveOperatorApplication(token, params.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  }

  async function onReject(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      await rejectOperatorApplication(token, params.id, rejectReason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setLoading(false);
    }
  }

  const canDecide = user?.role === "admin" || user?.role === "super_admin";

  if (!user) return null;

  return (
    <AppShell user={user} title="Application review">
      <PageHeader
        title={application?.trading_name ?? "Application"}
        subtitle="Review Kenji operator legal profile and approve or reject."
        action={
          <Link href="/applications">
            <Button variant="outline">Back to queue</Button>
          </Link>
        }
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {application && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Application</h2>
                <Badge>{application.status.replace(/_/g, " ")}</Badge>
              </div>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-slate-500">Legal name</dt>
                  <dd>{application.legal_name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Trading name</dt>
                  <dd>{application.trading_name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Proposed GRA ID</dt>
                  <dd><code>{application.proposed_external_id}</code></dd>
                </div>
                <div>
                  <dt className="text-slate-500">Platform operator ID</dt>
                  <dd><code>{application.platform_operator_id}</code></dd>
                </div>
                <div>
                  <dt className="text-slate-500">Staging hostname</dt>
                  <dd>{application.staging_hostname}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Registration number</dt>
                  <dd>{application.registration_number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">KRA PIN</dt>
                  <dd>{application.kra_pin ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Beneficial owner</dt>
                  <dd>{application.beneficial_owner ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email / phone</dt>
                  <dd>
                    {application.email ?? "—"} · {application.phone ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">County / region</dt>
                  <dd>
                    {application.county ?? "—"} · {application.region ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Licence number</dt>
                  <dd>{application.licence_number ?? "—"}</dd>
                </div>
              </dl>
              {application.created_operator && (
                <p className="text-sm text-slate-600">
                  Created operator:{" "}
                  <Link href={`/operators/${application.created_operator.external_id}`}>
                    {application.created_operator.external_id}
                  </Link>
                </p>
              )}
              {application.rejection_reason && (
                <p className="text-sm text-danger">Rejected: {application.rejection_reason}</p>
              )}
            </CardContent>
          </Card>

          {canDecide &&
            application.status !== "approved" &&
            application.status !== "rejected" && (
              <Card>
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold">Decision</h2>
                  <p className="text-sm text-slate-600">
                    Approve creates the GRA operator, primary site, ingest credentials, and
                    delivers keys to Kenji automatically.
                  </p>
                  <Button disabled={loading} onClick={onApprove}>
                    Approve application
                  </Button>
                  <form className="space-y-3 border-t border-border pt-4" onSubmit={onReject}>
                    <label className="block text-sm">
                      Rejection reason
                      <textarea
                        className="mt-1 w-full rounded-md border border-border p-2"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        required
                        minLength={4}
                        rows={4}
                      />
                    </label>
                    <Button type="submit" variant="danger" disabled={loading}>
                      Reject application
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </AppShell>
  );
}
