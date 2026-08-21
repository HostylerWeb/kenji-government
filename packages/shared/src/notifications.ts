export const NOTIFICATION_CATEGORIES = [
  "new_submission",
  "overdue_submission",
  "licence_expiry",
  "tax_arrears",
  "enforcement_update",
  "aml_alert",
  "document_uploaded",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationSeverity = "info" | "warning" | "danger";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  href: string;
  created_at: string;
  severity: NotificationSeverity;
}

export interface NotificationsResponse {
  items: AppNotification[];
  unread_count: number;
}
