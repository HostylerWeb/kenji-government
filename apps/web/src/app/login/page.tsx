"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, AlertTriangle, Mail, KeyRound, Loader2 } from "lucide-react";
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
    if (typeof window !== "undefined" && window.location.search.includes("reason=idle")) {
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
        if (response.status === "mfa_required") {
          setStep("mfa");
          setInfo("Enter your Google Authenticator code to continue.");
        }
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

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60";

  return (
    <div className="min-h-screen bg-background">
      <div className="kenya-stripe" />

      <div className="flex min-h-[calc(100vh-3px)] items-stretch">
        {/* ── Left panel (lg+) ─────────────────────────── */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between bg-sidebar p-10 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gra-green text-white text-sm font-bold">
              GRA
            </div>
            <span className="text-white font-semibold text-sm">GRA Oversight Console</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white leading-snug">
              Gambling Regulatory Authority
            </h2>
            <p className="mt-3 text-lg text-white/70">Kenya Raffle Oversight Platform</p>

            <div className="mt-10 space-y-4">
              {[
                "Real-time operator compliance monitoring",
                "Submission review and enforcement tools",
                "AML and payment oversight dashboard",
                "Regional and player safety analytics",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-gra-green shrink-0" />
                  <p className="text-sm text-white/80">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">Republic of Kenya — © {new Date().getFullYear()} GRA</p>
        </div>

        {/* ── Right panel — form ────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8 lg:max-w-[480px] lg:px-12 xl:px-16">
          {/* Logo (mobile) */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gra-green text-white">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold">GRA Oversight Console</h1>
            <p className="text-sm text-muted-foreground">Gambling Regulatory Authority — Kenya</p>
          </div>

          <div className="w-full max-w-sm">
            {/* Desktop logo */}
            <div className="hidden lg:block mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gra-green text-white">
                <Shield className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                GRA Oversight Console — Authorized Personnel Only
              </p>
            </div>

            {/* Authorized banner */}
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
              <p className="text-xs font-semibold uppercase tracking-wide text-danger">
                Authorized Personnel Only
              </p>
            </div>

            {/* ── Credentials step ──────────────────────── */}
            {step === "credentials" && (
              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
                    Email address
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

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(inputClass, "pr-10")}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-danger-subtle border border-danger/30 px-3 py-2.5 text-sm text-danger">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            )}

            {/* ── Email OTP step ────────────────────────── */}
            {step === "email_otp" && (
              <form onSubmit={handleEmailOtpVerify} className="space-y-4 animate-fade-in">
                <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning-subtle px-3 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                  <p className="text-sm text-warning-foreground leading-relaxed">
                    {emailOtpPilotDisabled ? AUTH_EMAIL_OTP_DISABLED_MESSAGE : info}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="otp">
                    Verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
                    placeholder={emailOtpPilotDisabled ? "0000" : "Enter code"}
                    className={cn(inputClass, "text-center text-xl tracking-[0.5em] font-mono")}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-danger-subtle border border-danger/30 px-3 py-2.5 text-sm text-danger">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Verifying…" : "Verify email code"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setOtpCode(""); setError(""); }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to sign in
                </button>
              </form>
            )}

            {/* ── MFA step ─────────────────────────────── */}
            {step === "mfa" && (
              <form onSubmit={handleMfaVerify} className="space-y-4 animate-fade-in">
                <div className="flex gap-3 rounded-lg border border-border bg-secondary px-3 py-3">
                  <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    {info || "Enter the 6-digit code from your authenticator app."}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="mfa">
                    Authenticator code
                  </label>
                  <input
                    id="mfa"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ""))}
                    placeholder="000000"
                    className={cn(inputClass, "text-center text-xl tracking-[0.5em] font-mono")}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-danger-subtle border border-danger/30 px-3 py-2.5 text-sm text-danger">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Verifying…" : "Verify"}
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Sessions expire after 30 minutes of inactivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
