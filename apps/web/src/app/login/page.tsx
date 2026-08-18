"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { loginRequest, verifyEmailOtpRequest, verifyMfaRequest } from "@/lib/api";
import { AUTH_EMAIL_OTP_DISABLED_MESSAGE } from "@kenji-government/shared";
import {
  getDeviceFingerprint,
  getUserAgentLabel,
} from "@/lib/device-fingerprint";
import {
  getStoredAuth,
  isLoginResponse,
  storeAuth,
} from "@/lib/auth";

type LoginStep = "credentials" | "email_otp" | "mfa";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@gra.go.ke");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [challengeToken, setChallengeToken] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const emailOtpPilotDisabled =
    process.env.NEXT_PUBLIC_AUTH_EMAIL_OTP_DISABLED === "true";

  useEffect(() => {
    if (getStoredAuth()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("reason=idle")
    ) {
      setError("Your session expired due to inactivity. Please sign in again.");
    }
  }, []);

  function finishLogin(response: {
    access_token: string;
    refresh_token: string;
    user: import("@kenji-government/shared").AuthUser;
  }) {
    storeAuth(response);
    router.push("/dashboard");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const fingerprint = await getDeviceFingerprint();
      const userAgentLabel = getUserAgentLabel();
      const response = await loginRequest(
        email,
        password,
        fingerprint,
        userAgentLabel,
      );

      if (isLoginResponse(response)) {
        setChallengeToken(response.challenge_token);
        if (response.status === "email_otp_required") {
          setStep("email_otp");
          setInfo(
            response.message ??
              "We sent a verification code to your email for this device.",
          );
        } else if (response.status === "mfa_required") {
          setStep("mfa");
        }
        return;
      }

      finishLogin(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await verifyEmailOtpRequest(challengeToken, otpCode);
      if (isLoginResponse(response)) {
        setChallengeToken(response.challenge_token);
        setOtpCode("");
        setStep("mfa");
        setInfo("Enter your Google Authenticator code to continue.");
        return;
      }
      finishLogin(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await verifyMfaRequest(challengeToken, otpCode);
      finishLogin(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="kenya-stripe" />
      <div className="flex min-h-[calc(100vh-4px)] items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gra-green text-white">
                <Shield className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-semibold">GRA Oversight Console</h1>
              <p className="mt-1 text-sm text-muted">
                Gambling Regulatory Authority — Kenya
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-danger">
                Authorized Personnel Only
              </p>
            </div>

            {step === "credentials" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gra.go.ke"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-gra-green/90 disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            )}

            {step === "email_otp" && (
              <form onSubmit={handleEmailOtpVerify} className="space-y-4">
                <div
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
                >
                  {emailOtpPilotDisabled ? (
                    <p>{AUTH_EMAIL_OTP_DISABLED_MESSAGE}</p>
                  ) : (
                    <p>{info}</p>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
                  placeholder={
                    emailOtpPilotDisabled ? "0000" : "Email verification code"
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-gra-green/90 disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify email code"}
                </button>
              </form>
            )}

            {step === "mfa" && (
              <form onSubmit={handleMfaVerify} className="space-y-4">
                <p className="text-sm text-muted">
                  {info || "Enter the 6-digit code from Google Authenticator."}
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
                  placeholder="6-digit code"
                  className="w-full rounded-lg border border-border px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-gra-green/90 disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-muted">
              Sessions expire after 30 minutes of inactivity.
            </p>
            <p className="mt-2 text-center text-xs text-muted">
              Republic of Kenya — Gambling Regulatory Authority
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
