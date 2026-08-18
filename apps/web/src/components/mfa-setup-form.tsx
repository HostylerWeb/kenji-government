"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  confirmMfaAuthenticated,
  confirmMfaLogin,
  setupMfaAuthenticated,
  setupMfaLogin,
  type MfaSetupResponse,
} from "@/lib/api";
import type { AuthResponse } from "@kenji-government/shared";

export function MfaSetupForm({
  challengeToken,
  onComplete,
  onError,
}: {
  challengeToken?: string;
  onComplete: (response: AuthResponse) => void;
  onError: (message: string) => void;
}) {
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = challengeToken
          ? await setupMfaLogin(challengeToken)
          : await setupMfaAuthenticated(
              localStorage.getItem("gra_access_token") ?? "",
            );
        if (cancelled) return;
        setSetup(response);
        const url = await QRCode.toDataURL(response.otpauth_url);
        if (!cancelled) setQrDataUrl(url);
      } catch (err) {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : "MFA setup failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [challengeToken, onError]);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setLoading(true);
    try {
      const response = challengeToken
        ? await confirmMfaLogin(challengeToken, code)
        : await confirmMfaAuthenticated(
            localStorage.getItem("gra_access_token") ?? "",
            code,
          );
      onComplete(response);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  if (!setup) {
    return (
      <p className="text-sm text-muted">Preparing MFA setup...</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Scan this QR code with your authenticator app (Google Authenticator,
        Authy, etc.), then enter the 6-digit code.
      </p>
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="MFA QR code"
          className="mx-auto rounded-lg border border-border"
          width={180}
          height={180}
        />
      )}
      <p className="text-center text-xs text-muted">
        Manual key: <code className="rounded bg-secondary px-1 break-all">{setup.secret}</code>
      </p>
      <form onSubmit={handleConfirm} className="space-y-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
          placeholder="6-digit code"
          className="w-full rounded-lg border border-border px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-gra-green/90 disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Confirm and continue"}
        </button>
      </form>
    </div>
  );
}
