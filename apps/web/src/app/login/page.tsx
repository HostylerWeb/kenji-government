"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { loginRequest, verifyEmailOtpRequest, verifyMfaRequest } from "@/lib/api";
import { AUTH_EMAIL_OTP_DISABLED_MESSAGE } from "@kenji-government/shared";
import { getDeviceFingerprint, getUserAgentLabel } from "@/lib/device-fingerprint";
import { getStoredAuth, isLoginResponse, storeAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoginStep = "credentials" | "email_otp" | "mfa";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@gra.go.ke");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [challengeToken, setChallengeToken] = useState("");
  const [otpCode, setOtpCode] = useState("");

  const emailOtpPilotDisabled =
    process.env.NEXT_PUBLIC_AUTH_EMAIL_OTP_DISABLED === "true";

  useEffect(() => {
    if (getStoredAuth()) router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "idle") {
      setError("Your session expired due to inactivity. Please sign in again.");
    } else if (reason === "expired") {
      setError("Your session has expired. Please sign in again.");
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
      const response = await loginRequest(email, password, fingerprint, userAgentLabel);

      if (isLoginResponse(response)) {
        setChallengeToken(response.challenge_token);
        if (response.status === "email_otp_required") {
          setStep("email_otp");
          setInfo(response.message ?? "We sent a verification code to your email for this device.");
        } else if (response.status === "mfa_required") {
          setStep("mfa");
        }
        return;
      }
      finishLogin(response);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Sign-in failed. Please try again.",
      );
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
        if (response.status === "mfa_required") {
          setStep("mfa");
          setInfo("Enter your Google Authenticator code to continue.");
        }
        return;
      }
      finishLogin(response);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Invalid code. Please try again.",
      );
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
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus:border-primary focus:ring-[3px] focus:ring-primary/20";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4">
      <div className="absolute left-0 right-0 top-0 h-2 bg-gradient-to-r from-[#202020] via-[#c12d31] to-[#00a551]" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02]">
        <ShieldCheck className="h-[800px] w-[800px]" aria-hidden="true" />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <img src="/gra-crest.png" alt="GRA crest" className="h-20 w-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Raffle Oversight Console
          </h1>
          <p className="mt-2 max-w-[280px] text-sm text-slate-500">
            Gambling Regulatory Authority of Kenya
          </p>
        </div>

        <div className="flex flex-col gap-6 rounded-xl border-0 bg-white py-6 shadow-2xl shadow-slate-200/50">
          <div className="space-y-1 px-6 pb-2">
            <h2 className="text-center text-xl font-semibold text-slate-900">
              Authorized Personnel Only
            </h2>
            <p className="text-center text-sm text-muted-foreground">
              Enter your credentials to access the secure portal
            </p>
          </div>

          {step === "credentials" && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Official Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gra.go.ke"
                    className={inputClass}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" htmlFor="password">
                      Password
                    </label>
                    <span className="text-xs font-medium text-primary">Forgot password?</span>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(inputClass, "pr-10 font-mono tracking-widest")}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[#c12d31]">{error}</p>
                )}
              </div>
              <div className="flex flex-col gap-4 px-6 pb-2 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#00a551] text-base font-semibold text-white shadow-md shadow-[#00a551]/20 transition-all hover:bg-[#008a43] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {loading ? "Signing in…" : "Secure Login"}
                </button>
                <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Protected by National Encryption Standards
                </p>
              </div>
            </form>
          )}

          {step === "email_otp" && (
            <form onSubmit={handleEmailOtpVerify} className="space-y-4 px-6">
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p className="text-sm leading-relaxed text-amber-950">
                  {emailOtpPilotDisabled ? AUTH_EMAIL_OTP_DISABLED_MESSAGE : info}
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
                placeholder={emailOtpPilotDisabled ? "0000" : "Enter code"}
                className={cn(inputClass, "h-11 text-center font-mono text-xl tracking-[0.4em]")}
                required
                autoFocus
              />
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[#c12d31]">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#00a551] font-semibold text-white shadow-md shadow-[#00a551]/20 hover:bg-[#008a43] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Verifying…" : "Verify email code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setOtpCode("");
                  setError("");
                }}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-900"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {step === "mfa" && (
            <form onSubmit={handleMfaVerify} className="space-y-4 px-6">
              <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <p className="text-sm text-slate-600">
                  {info || "Enter the 6-digit code from your authenticator app."}
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
                placeholder="000000"
                className={cn(inputClass, "h-11 text-center font-mono text-xl tracking-[0.4em]")}
                required
                autoFocus
              />
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[#c12d31]">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#00a551] font-semibold text-white shadow-md shadow-[#00a551]/20 hover:bg-[#008a43] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Verifying…" : "Verify"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-10 text-center text-[10px] font-medium text-slate-400">
          <p>© {new Date().getFullYear()} Republic of Kenya.</p>
          <p>Strictly for official government use only.</p>
        </div>
      </div>
    </div>
  );
}
