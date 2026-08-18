import type { AuthResponse, LoginResponse } from "@kenji-government/shared";

const ACCESS_KEY = "gra_access_token";
const REFRESH_KEY = "gra_refresh_token";
const USER_KEY = "gra_user";
const ACTIVITY_KEY = "gra_last_activity";

export const SESSION_IDLE_MS =
  Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MS ?? 1800000);

export function getStoredAuth(): {
  access_token: string;
  refresh_token: string;
  user: AuthResponse["user"];
} | null {
  if (typeof window === "undefined") return null;

  const access_token = localStorage.getItem(ACCESS_KEY);
  const refresh_token = localStorage.getItem(REFRESH_KEY);
  const userRaw = localStorage.getItem(USER_KEY);

  if (!access_token || !refresh_token || !userRaw) return null;

  if (isSessionIdleExpired()) {
    clearAuth();
    return null;
  }

  try {
    return {
      access_token,
      refresh_token,
      user: JSON.parse(userRaw) as AuthResponse["user"],
    };
  } catch {
    return null;
  }
}

export function storeAuth(data: AuthResponse) {
  localStorage.setItem(ACCESS_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  touchSessionActivity();
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
}

export function touchSessionActivity() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function isSessionIdleExpired(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(ACTIVITY_KEY);
  if (!raw) return false;
  const last = Number(raw);
  if (!Number.isFinite(last)) return false;
  return Date.now() - last > SESSION_IDLE_MS;
}

export function isLoginResponse(
  data: LoginResponse | AuthResponse,
): data is LoginResponse {
  return (
    "status" in data &&
    (data.status === "mfa_required" ||
      data.status === "mfa_setup_required" ||
      data.status === "email_otp_required")
  );
}
