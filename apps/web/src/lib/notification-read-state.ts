const READ_KEY = "gra_read_notification_ids";
const MAX_STORED = 200;

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  const trimmed = [...ids].slice(-MAX_STORED);
  localStorage.setItem(READ_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent("gra-notifications-read"));
}

export function getReadNotificationIds(): Set<string> {
  return readIds();
}

export function markNotificationRead(id: string) {
  const ids = readIds();
  if (ids.has(id)) return;
  ids.add(id);
  writeIds(ids);
}

export function markAllNotificationsRead(notificationIds: string[]) {
  const ids = readIds();
  for (const id of notificationIds) {
    ids.add(id);
  }
  writeIds(ids);
}

export function countUnreadNotificationIds(notificationIds: string[]): number {
  const read = readIds();
  return notificationIds.filter((id) => !read.has(id)).length;
}
