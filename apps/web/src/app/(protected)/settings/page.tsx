"use client";

import { useEffect, useState } from "react";
import { UserPlus, KeyRound, Users, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogBody,
} from "@/components/dialog";
import { toast } from "@/components/toast";
import { PageHeader } from "@/components/page-header";
import { TableScroll } from "@/components/table-scroll";
import { useAuth } from "@/lib/use-auth";
import {
  getUsers,
  createUser,
  updateUser,
  getOperators,
  getOperatorSites,
  generateApiCredential,
  revokeApiCredential,
  getSystemSettings,
  updateSystemSettings,
  disableMfa,
  getSecurityPreferences,
  updateSecurityPreferences,
  type StaffUser,
  type SystemSettings,
  type SecurityPreferences,
} from "@/lib/api";
import { MfaSetupForm } from "@/components/mfa-setup-form";
import { storeAuth } from "@/lib/auth";

const ALL_ROLES = [
  "super_admin",
  "admin",
  "supervisor",
  "analyst",
  "auditor",
] as const;

const ADMIN_ASSIGNABLE = ["supervisor", "analyst", "auditor"] as const;

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [operatorId, setOperatorId] = useState("");
  const [sites, setSites] = useState<
    Array<{
      id: string;
      domain: string;
      api_credentials: Array<{ id: string; api_key_prefix: string; is_active: boolean }>;
    }>
  >([]);
  const [credentials, setCredentials] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [securityPrefs, setSecurityPrefs] = useState<SecurityPreferences | null>(
    null,
  );

  const isAdmin =
    user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const assignableRoles = isSuperAdmin ? ALL_ROLES : ADMIN_ASSIGNABLE;
  const mfaPilotDisabled =
    process.env.NEXT_PUBLIC_AUTH_MFA_DISABLED === "true";
  const emailOtpPilotDisabled =
    process.env.NEXT_PUBLIC_AUTH_EMAIL_OTP_DISABLED === "true";

  useEffect(() => {
    if (!token) return;
    getSecurityPreferences(token).then(setSecurityPrefs).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    getUsers(token).then(setUsers).catch(() => {});
    getSystemSettings(token).then(setSystemSettings).catch(() => {});
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !operatorId) return;
    getOperatorSites(token, operatorId).then(setSites).catch(() => {});
  }, [token, operatorId]);

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setCreateUserLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await createUser(token, {
        email: String(form.get("email")),
        password: String(form.get("password")),
        full_name: String(form.get("full_name")),
        role: String(form.get("role")),
      });
      toast.success("User created successfully.");
      setUsers(await getUsers(token));
      setCreateUserOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreateUserLoading(false);
    }
  }

  async function toggleUser(id: string, is_active: boolean) {
    if (!token) return;
    await updateUser(token, id, { is_active: !is_active });
    setUsers(await getUsers(token));
    toast.success(is_active ? "User deactivated." : "User activated.");
  }

  async function changeRole(id: string, role: string) {
    if (!token) return;
    await updateUser(token, id, { role });
    setUsers(await getUsers(token));
    toast.success("Role updated.");
  }

  async function handleSystemSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !isSuperAdmin) return;
    const form = new FormData(e.currentTarget);

    try {
      const updated = await updateSystemSettings(token, {
        treasury_account_ref: {
          account_ref: String(form.get("treasury_ref")),
        },
      });
      setSystemSettings(updated);
      toast.success("System settings updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    }
  }

  async function handleGenerateCredential(siteId: string) {
    if (!token) return;
    try {
      const result = await generateApiCredential(token, siteId);
      setCredentials(`API Key: ${result.api_key}\nHMAC Secret: ${result.hmac_secret}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleRevokeCredential(siteId: string, credentialId: string) {
    if (!token) return;
    // use native confirm for now (Phase 8 will replace with Dialog)
    if (!window.confirm("Revoke this API credential?")) return;
    try {
      await revokeApiCredential(token, siteId, credentialId);
      toast.success("Credential revoked.");
      if (operatorId) setSites(await getOperatorSites(token, operatorId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Settings">
      <div className="mb-5">
        <PageHeader
          title="Settings"
          subtitle="Security, system configuration and staff user management"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
          action={
            isAdmin ? (
              <Button size="sm" leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setCreateUserOpen(true)}>
                Create User
              </Button>
            ) : undefined
          }
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Sign-in Security
          </CardTitle>
        </CardHeader>
        <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Optional layers you can turn on for your account.
        </p>

        {securityPrefs && (
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={securityPrefs.google_authenticator_enabled}
                disabled={mfaPilotDisabled}
                onChange={async (e) => {
                  if (!token || mfaPilotDisabled) return;
                  if (e.target.checked) {
                    setShowMfaSetup(true);
                    return;
                  }
                  try {
                    await updateSecurityPreferences(token, {
                      google_authenticator_enabled: false,
                    });
                    await disableMfa(token);
                    const prefs = await getSecurityPreferences(token);
                    setSecurityPrefs(prefs);
                    toast.success("Google Authenticator disabled.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
                className="mt-1"
              />
              <span>
                <strong>Google Authenticator (2FA)</strong>
                <br />
                <span className="text-muted">
                  Use an authenticator app for a 6-digit code at sign-in.
                  {mfaPilotDisabled && (
                    <>
                      <br />
                      <span className="text-amber-800">
                        Disabled for now during pilot testing.
                      </span>
                    </>
                  )}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={securityPrefs.email_otp_new_device_enabled}
                disabled={emailOtpPilotDisabled}
                onChange={async (e) => {
                  if (!token || emailOtpPilotDisabled) return;
                  try {
                    const prefs = await updateSecurityPreferences(token, {
                      email_otp_new_device_enabled: e.target.checked,
                    });
                    setSecurityPrefs(prefs);
                    toast.success("Email verification preference updated.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed");
                  }
                }}
                className="mt-1"
              />
              <span>
                <strong>Email code on new devices</strong>
                <br />
                <span className="text-muted">
                  When we detect an unfamiliar device fingerprint, send a one-time
                  code to your email before sign-in completes.
                  {emailOtpPilotDisabled && (
                    <>
                      <br />
                      <span className="text-amber-800">
                        Disabled for now — use 0000 at sign-in during pilot
                        testing.
                      </span>
                    </>
                  )}
                </span>
              </span>
            </label>
          </div>
        )}

        {showMfaSetup && !mfaPilotDisabled && (
          <div className="mt-4 border-t border-border pt-4">
            <MfaSetupForm
              onComplete={(response) => {
                storeAuth(response);
                setShowMfaSetup(false);
                getSecurityPreferences(token!).then(setSecurityPrefs);
                toast.success("Google Authenticator enabled.");
              }}
              onError={(err) => toast.error(err)}
            />
          </div>
        )}
        </CardContent>
      </Card>

      {credentials && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />New API Credentials</CardTitle></CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-secondary p-3 text-xs break-all">{credentials}</pre>
            <p className="mt-2 text-xs text-danger">Store securely — shown once only.</p>
          </CardContent>
        </Card>
      )}

      {isAdmin ? (
        <>
          {systemSettings && (
            <Card className="mb-6">
              <h2 className="mb-2 text-base font-semibold">System configuration</h2>
              {isSuperAdmin ? (
                <p className="mb-4 text-xs text-muted">
                  Super administrator only — treasury account reference. Tax rate and SMTP are configured in the server environment.
                </p>
              ) : (
                <p className="mb-4 text-xs text-muted">
                  Read-only. Contact a super administrator to change the treasury account reference.
                </p>
              )}
              <form onSubmit={handleSystemSettings} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Government tax rate (%)
                  <input
                    readOnly
                    value={Math.round(systemSettings.tax_rate * 1000) / 10}
                    className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Set via GOVERNMENT_TAX_RATE in the server environment
                  </span>
                </label>
                <label className="text-sm">
                  SMTP configuration
                  <input
                    readOnly
                    value={
                      systemSettings.smtp.configured
                        ? `${systemSettings.smtp.host}:${systemSettings.smtp.port ?? 587}`
                        : "Not configured"
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Set via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in the server environment
                  </span>
                </label>
                <label className="text-sm sm:col-span-2">
                  Treasury account ref
                  <input
                    name="treasury_ref"
                    disabled={!isSuperAdmin}
                    defaultValue={systemSettings.treasury_account_ref ?? ""}
                    className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-secondary"
                  />
                </label>
                {isSuperAdmin && (
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-white sm:col-span-2"
                  >
                    Save system settings
                  </button>
                )}
              </form>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Staff Users</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TableScroll>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/50">
                  <tr>
                    {["Name", "Email", "Role", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                      <td className="px-5 py-3.5 font-medium">{u.full_name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          className="rounded border border-border bg-background px-2 py-1 text-xs capitalize"
                          disabled={u.id === user.id || (u.role === "super_admin" && !isSuperAdmin)}
                        >
                          {(u.role === "super_admin" || u.role === "admin" ? ALL_ROLES : assignableRoles).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={u.is_active ? "success" : "muted"} dot>
                          {u.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => toggleUser(u.id, u.is_active)}
                          className="text-xs text-primary hover:underline disabled:opacity-50"
                          disabled={u.id === user.id || (u.role === "super_admin" && !isSuperAdmin)}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </TableScroll>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />Operator API Credentials</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <OperatorSelect token={token!} onSelect={setOperatorId} />
              {sites.map((site) => (
                <div key={site.id} className="rounded-lg border border-border p-3 space-y-2">
                  <p className="font-medium text-sm">{site.domain}</p>
                  <ul className="space-y-1">
                    {site.api_credentials.map((cred) => (
                      <li key={cred.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">{cred.api_key_prefix}… — {cred.is_active ? "active" : "revoked"}</span>
                        {cred.is_active && (
                          <button onClick={() => handleRevokeCredential(site.id, cred.id)} className="text-danger hover:underline">Revoke</button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleGenerateCredential(site.id)} className="text-sm text-primary hover:underline">
                    Generate new credential
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Settings are available to GRA administrators only.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Create User Dialog ──────────────────────────── */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Staff User</DialogTitle>
          </DialogHeader>
          <form id="create-user-form" onSubmit={handleCreateUser}>
            <DialogBody className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Full name</label>
                <input name="full_name" placeholder="Jane Doe" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email</label>
                <input name="email" type="email" placeholder="jane@gra.go.ke" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Password</label>
                <input name="password" type="password" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Role</label>
                <select name="role" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize outline-none focus:border-primary">
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm" type="button">Cancel</Button>
              </DialogClose>
              <Button type="submit" form="create-user-form" size="sm" loading={createUserLoading}>
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function OperatorSelect({
  token,
  onSelect,
}: {
  token: string;
  onSelect: (id: string) => void;
}) {
  const [operators, setOperators] = useState<Array<{ external_id: string; trading_name: string }>>([]);

  useEffect(() => {
    getOperators(token).then((ops) =>
      setOperators(ops.map((o) => ({ external_id: o.external_id, trading_name: o.trading_name }))),
    );
  }, [token]);

  return (
    <select
      onChange={(e) => onSelect(e.target.value)}
      className="mb-4 w-full rounded-lg border border-border px-3 py-2 text-sm"
    >
      <option value="">Select operator for API credentials...</option>
      {operators.map((op) => (
        <option key={op.external_id} value={op.external_id}>
          {op.trading_name}
        </option>
      ))}
    </select>
  );
}
