/**
 * Stable browser fingerprint for trusted-device detection (not hardware biometrics).
 */
export async function getDeviceFingerprint(): Promise<string> {
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency ?? 0),
  ].join("|");

  const data = new TextEncoder().encode(parts);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getUserAgentLabel(): string {
  return navigator.userAgent.slice(0, 256);
}
