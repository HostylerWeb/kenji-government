"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import {
  getUsers,
  createUser,
  updateUser,
  getOperators,
  getOperatorSites,
  generateApiCredential,
  revokeApiCredential,
  type StaffUser,
} from "@/lib/api";

const ROLES = ["admin", "supervisor", "analyst", "auditor"] as const;

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [operatorId, setOperatorId] = useState("");
  const [sites, setSites] = useState<
    Array<{
      id: string;
      domain: string;
      api_credentials: Array<{ id: string; api_key_prefix: string; is_active: boolean }>;
    }>
  >([]);
  const [credentials, setCredentials] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!token || !isAdmin) return;
    getUsers(token).then(setUsers).catch(() => {});
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !operatorId) return;
    getOperatorSites(token, operatorId).then(setSites).catch(() => {});
  }, [token, operatorId]);

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    try {
      await createUser(token, {
        email: String(form.get("email")),
        password: String(form.get("password")),
        full_name: String(form.get("full_name")),
        role: String(form.get("role")),
      });
      setMessage("User created.");
      setUsers(await getUsers(token));
      e.currentTarget.reset();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  async function toggleUser(id: string, is_active: boolean) {
    if (!token) return;
    await updateUser(token, id, { is_active: !is_active });
    setUsers(await getUsers(token));
  }

  async function changeRole(id: string, role: string) {
    if (!token) return;
    await updateUser(token, id, { role });
    setUsers(await getUsers(token));
    setMessage("Role updated.");
  }

  async function handleGenerateCredential(siteId: string) {
    if (!token) return;
    try {
      const result = await generateApiCredential(token, siteId);
      setCredentials(
        `API Key: ${result.api_key}\nHMAC Secret: ${result.hmac_secret}`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleRevokeCredential(siteId: string, credentialId: string) {
    if (!token) return;
    if (!confirm("Revoke this API credential?")) return;
    try {
      await revokeApiCredential(token, siteId, credentialId);
      setMessage("Credential revoked.");
      if (operatorId) setSites(await getOperatorSites(token, operatorId));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Settings">
      {message && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">{message}</p>
      )}
      {credentials && (
        <Card className="mb-6">
          <h2 className="mb-2 font-semibold">New API Credentials</h2>
          <pre className="rounded-lg bg-secondary p-3 text-xs">{credentials}</pre>
          <p className="mt-2 text-xs text-danger">Store securely — shown once only.</p>
        </Card>
      )}

      {isAdmin ? (
        <>
          <Card className="mb-6">
            <h2 className="mb-4 text-base font-semibold">Staff Users</h2>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{u.full_name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="rounded border border-border px-2 py-1 text-xs capitalize"
                        disabled={u.id === user.id}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">{u.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleUser(u.id, u.is_active)}
                        className="text-xs text-primary hover:underline"
                        disabled={u.id === user.id}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="mb-6">
            <h2 className="mb-4 text-base font-semibold">Create User</h2>
            <form onSubmit={handleCreateUser} className="grid gap-3 sm:grid-cols-2">
              <input name="full_name" placeholder="Full name" required className="rounded-lg border border-border px-3 py-2 text-sm" />
              <input name="email" type="email" placeholder="Email" required className="rounded-lg border border-border px-3 py-2 text-sm" />
              <input name="password" type="password" placeholder="Password" required className="rounded-lg border border-border px-3 py-2 text-sm" />
              <select name="role" className="rounded-lg border border-border px-3 py-2 text-sm">
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white sm:col-span-2">
                Create User
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold">Operator API Credentials</h2>
            <OperatorSelect token={token!} onSelect={setOperatorId} />
            {sites.map((site) => (
              <div key={site.id} className="mb-4 rounded-lg border border-border p-3">
                <p className="font-medium">{site.domain}</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {site.api_credentials.map((cred) => (
                    <li key={cred.id} className="flex items-center justify-between gap-2">
                      <span>
                        {cred.api_key_prefix}… — {cred.is_active ? "active" : "revoked"}
                      </span>
                      {cred.is_active && (
                        <button
                          onClick={() => handleRevokeCredential(site.id, cred.id)}
                          className="text-danger hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleGenerateCredential(site.id)}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Generate new credential
                </button>
              </div>
            ))}
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            Settings are available to GRA administrators only.
          </p>
        </Card>
      )}
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
