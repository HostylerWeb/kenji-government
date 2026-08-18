import type { AuthUser } from "@kenji-government/shared";

const ACCESS_KEY = "gra_access_token";
const REFRESH_KEY = "gra_refresh_token";
const USER_KEY = "gra_user";

export function getStoredAuth(): {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
} | null {
  if (typeof window === "undefined") return null;

  const access_token = localStorage.getItem(ACCESS_KEY);
  const refresh_token = localStorage.getItem(REFRESH_KEY);
  const userRaw = localStorage.getItem(USER_KEY);

  if (!access_token || !refresh_token || !userRaw) return null;

  try {
    return {
      access_token,
      refresh_token,
      user: JSON.parse(userRaw) as AuthUser,
    };
  } catch {
    return null;
  }
}

export function storeAuth(data: {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}) {
  localStorage.setItem(ACCESS_KEY, data.access_token);
  localStorage.setItem(REFRESH_KEY, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
