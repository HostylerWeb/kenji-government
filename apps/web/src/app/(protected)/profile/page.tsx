"use client";

import { useEffect, useState } from "react";
import { User, KeyRound, Mail } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { toast } from "@/components/toast";
import { useAuth } from "@/lib/use-auth";
import { getProfile, updateProfile } from "@/lib/api";
import { updateStoredUser } from "@/lib/auth";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  super_admin: "Super Administrator",
  supervisor: "Supervisor",
  analyst: "Analyst",
  auditor: "Auditor",
};

export default function ProfilePage() {
  const { user, token, ready } = useAuth();
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!token) return;
    getProfile(token)
      .then((profile) => setFullName(profile.full_name))
      .catch(() => {
        if (user) setFullName(user.full_name);
      });
  }, [token, user]);

  if (!ready || !user || !token) return null;

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    if (trimmed === user!.full_name) {
      toast.info("No changes to save.");
      return;
    }

    setSavingName(true);
    try {
      const updated = await updateProfile(token!, { full_name: trimmed });
      updateStoredUser(updated);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Enter your current and new password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const updated = await updateProfile(token!, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      updateStoredUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <AppShell
      user={user}
      title="My Profile"
      breadcrumbs={[{ label: "My Profile" }]}
    >
      <PageHeader
        title="My Profile"
        subtitle="Update your display name and password. Your email address cannot be changed."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Account details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
                {user.email}
              </p>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed after account creation.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <Badge variant="muted">{roleLabels[user.role] ?? user.role}</Badge>
            </div>

            <form onSubmit={handleNameSubmit} className="space-y-3 border-t border-border pt-5">
              <label htmlFor="full_name" className="text-sm font-medium">
                Full name
              </label>
              <input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoComplete="name"
                required
                minLength={2}
              />
              <Button type="submit" loading={savingName}>
                Save name
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Change password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="current_password" className="text-sm font-medium">
                  Current password
                </label>
                <input
                  id="current_password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="new_password" className="text-sm font-medium">
                  New password
                </label>
                <input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm_password" className="text-sm font-medium">
                  Confirm new password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <Button type="submit" variant="secondary" loading={savingPassword}>
                Update password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
