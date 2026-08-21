import type {
  AuthResponse,
  AuthUser,
  CreateEnforcementCaseInput,
  LoginResponse,
  MfaSetupResponse,
  NotificationsResponse,
  SecurityPreferences,
  UpdateProfileInput,
} from "@kenji-government/shared";
import { forceLogout } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function parseResponse<T>(
  response: Response,
  options?: { authenticated?: boolean },
): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401 && options?.authenticated) {
      forceLogout("expired");
    }

    const message =
      data?.message ?? data?.error ?? `Request failed (${response.status})`;
    throw new ApiError(
      Array.isArray(message) ? message.join(", ") : String(message),
      response.status,
    );
  }

  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  return parseResponse<T>(response, {
    authenticated: Boolean(options.token),
  });
}

export async function loginRequest(
  email: string,
  password: string,
  deviceFingerprint?: string,
  userAgentLabel?: string,
) {
  return apiRequest<LoginResponse | AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      device_fingerprint: deviceFingerprint,
      user_agent_label: userAgentLabel,
    }),
  });
}

export async function verifyEmailOtpRequest(challengeToken: string, code: string) {
  return apiRequest<LoginResponse | AuthResponse>("/auth/email-otp/verify", {
    method: "POST",
    body: JSON.stringify({ challenge_token: challengeToken, code }),
  });
}

export async function verifyMfaRequest(challengeToken: string, code: string) {
  return apiRequest<AuthResponse>("/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify({ challenge_token: challengeToken, code }),
  });
}

export async function setupMfaLogin(challengeToken: string) {
  return apiRequest<MfaSetupResponse>("/auth/mfa/setup", {
    method: "POST",
    body: JSON.stringify({ challenge_token: challengeToken }),
  });
}

export async function setupMfaAuthenticated(token: string) {
  return apiRequest<MfaSetupResponse>("/auth/mfa/setup/authenticated", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export async function confirmMfaLogin(challengeToken: string, code: string) {
  return apiRequest<AuthResponse>("/auth/mfa/confirm", {
    method: "POST",
    body: JSON.stringify({ challenge_token: challengeToken, code }),
  });
}

export async function confirmMfaAuthenticated(token: string, code: string) {
  return apiRequest<AuthResponse>("/auth/mfa/confirm/authenticated", {
    method: "POST",
    token,
    body: JSON.stringify({ code }),
  });
}

export async function disableMfa(token: string) {
  return apiRequest<{ success: boolean }>("/auth/mfa/disable", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export async function getSecurityPreferences(token: string) {
  return apiRequest<SecurityPreferences>("/auth/security-preferences", {
    token,
  });
}

export async function updateSecurityPreferences(
  token: string,
  prefs: Partial<SecurityPreferences>,
) {
  return apiRequest<SecurityPreferences>("/auth/security-preferences", {
    method: "POST",
    token,
    body: JSON.stringify({
      google_authenticator_enabled: prefs.google_authenticator_enabled,
      email_otp_new_device_enabled: prefs.email_otp_new_device_enabled,
    }),
  });
}

export async function getProfile(token: string) {
  return apiRequest<AuthUser>("/auth/me", { token });
}

export async function updateProfile(token: string, input: UpdateProfileInput) {
  return apiRequest<AuthUser>("/auth/profile", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export async function logoutRequest(token: string) {
  return apiRequest<{ success: boolean }>("/auth/logout", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export type { MfaSetupResponse, SecurityPreferences, UpdateProfileInput };

export interface DashboardStats {
  total_active_operators: number;
  compliant_operators: number;
  at_risk_operators: number;
  non_compliant_operators: number;
  total_annual_ggr: string;
  total_tax_paid: string;
  total_tax_due: string;
  total_monthly_tickets: number;
}

export interface LicenceItem {
  id: string;
  licence_number: string;
  licence_type: string;
  issued_at: string;
  expires_at: string;
  status: string;
}

export interface OperatorListItem {
  id: string;
  external_id: string;
  legal_name: string;
  trading_name: string;
  county: string | null;
  region: string | null;
  website: string | null;
  status: string;
  compliance_status: string;
  risk_score: number;
  annual_ggr: string | null;
  tax_paid: string | null;
  tax_due: string | null;
  monthly_tickets: number | null;
  open_cases_count?: number;
  warnings_count?: number;
  licences?: LicenceItem[];
  operator_sites?: Array<{ domain: string }>;
}

export interface OperatorDetail extends OperatorListItem {
  beneficial_owner?: string | null;
  email?: string | null;
  phone?: string | null;
  last_submission_at?: string | null;
  monthly_snapshots?: Array<{
    gross_gaming_revenue: string;
    tax_paid: string;
    tickets_sold: string;
    reporting_period: { label: string };
  }>;
}

export async function getDashboardStats(token: string) {
  return apiRequest<DashboardStats>("/operators/stats", { token });
}

export async function getOperators(
  token: string,
  params?: { search?: string; region?: string; compliance_status?: string },
) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.region) query.set("region", params.region);
  if (params?.compliance_status)
    query.set("compliance_status", params.compliance_status);

  const qs = query.toString();
  return apiRequest<OperatorListItem[]>(
    `/operators${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function getOperator(token: string, externalId: string) {
  return apiRequest<OperatorDetail>(`/operators/${externalId}`, { token });
}

export interface SubmissionItem {
  id: string;
  status: string;
  tickets_sold?: string;
  gross_revenue?: string;
  prizes_paid?: string;
  expenses?: string;
  gross_gaming_revenue: string;
  tax_due: string;
  tax_paid: string;
  tax_outstanding: string;
  submitted_at: string | null;
  notes?: string | null;
  reviewed_at?: string | null;
  operator?: { external_id: string; trading_name: string };
  reporting_period?: { id?: string; label: string; year?: number; month?: number };
  reviewer?: { full_name: string };
  documents?: SubmissionDocument[];
}

export interface SubmissionDocument {
  id: string;
  title: string;
  document_type: string;
  file_size: string | null;
  mime_type: string | null;
  uploaded_at: string;
}

export type SubmissionDetail = SubmissionItem;

export interface EnforcementCase {
  id: string;
  case_number: string;
  case_type: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  opener?: { full_name: string };
  operator?: { external_id: string; trading_name: string };
  actions?: Array<{
    id: string;
    action_type: string;
    details: string | null;
    created_at: string;
    performer?: { full_name: string };
  }>;
}

export interface DocumentItem {
  id: string;
  title: string;
  document_type: string;
  file_path: string;
  file_size: string | null;
  mime_type: string | null;
  uploaded_at: string;
  uploader?: { full_name: string };
}

export interface ComplianceOverview {
  tiers: { compliant: number; at_risk: number; non_compliant: number };
  total_arrears: string;
  overdue_submission_count: number;
  pending_submission_count: number;
  calendar_summary: {
    upcoming_deadlines: number;
    overdue_filings: number;
    pending_review: number;
    expiring_licences: number;
  };
  upcoming_deadlines: Array<{
    id: string;
    type: "monthly_return" | "licence_renewal" | "submission_review";
    title: string;
    due_date: string;
    status: "upcoming" | "due_today" | "overdue";
    operator_external_id?: string;
    operator_name?: string;
  }>;
  expiring_licences: Array<{
    operator_external_id: string;
    operator_name: string;
    licence_number: string;
    expires_at: string;
    days_remaining: number;
  }>;
  overdue_filings: Array<{
    operator_external_id: string;
    operator_name: string;
    last_submission_at: string | null;
    compliance_status: string;
    reason: string;
    days_overdue: number | null;
  }>;
  pending_reviews: Array<{
    id: string;
    operator_external_id: string;
    operator_name: string;
    period: string;
    submitted_at: string | null;
    tax_outstanding: string;
    is_overdue: boolean;
  }>;
  overdue_submissions: Array<{
    id: string;
    operator_external_id: string;
    operator_name: string;
    period: string;
    submitted_at: string | null;
    tax_outstanding: string;
  }>;
  operators: Array<{
    external_id: string;
    trading_name: string;
    compliance_status: string;
    tax_outstanding: string;
    licence_expiring: boolean;
  }>;
}

export interface DashboardAlerts {
  overdue_submissions: Array<{ type: string; message: string; operator_external_id: string }>;
  licence_expiry: Array<{ type: string; message: string; operator_external_id: string }>;
  tax_arrears: Array<{ type: string; message: string; operator_external_id: string }>;
}

export interface StaffUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  user?: { email: string; full_name: string; role: string };
}

export async function getSubmissions(token: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return apiRequest<SubmissionItem[]>(`/submissions${qs}`, { token });
}

export async function getSubmission(token: string, id: string) {
  return apiRequest<SubmissionDetail>(`/submissions/${id}`, { token });
}

export async function getSubmissionStats(token: string) {
  return apiRequest<Record<string, number>>("/submissions/stats", { token });
}

export async function getOperatorSubmissions(token: string, externalId: string) {
  return apiRequest<SubmissionItem[]>(
    `/operators/${externalId}/submissions`,
    { token },
  );
}

export async function reviewSubmission(
  token: string,
  id: string,
  status: "approved" | "rejected" | "revision_requested",
  notes?: string,
) {
  return apiRequest<SubmissionDetail>(`/submissions/${id}/review`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status, notes }),
  });
}

export interface EnforcementWarning {
  id: string;
  action_type: string;
  details: string | null;
  created_at: string;
  performer?: { full_name: string };
  case?: {
    id: string;
    case_number: string;
    title: string;
    operator?: { external_id: string; trading_name: string };
  };
}

export async function getEnforcementCases(
  token: string,
  params?: { status?: string; bucket?: "open" | "resolved"; operator_external_id?: string },
) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.bucket) query.set("bucket", params.bucket);
  if (params?.operator_external_id)
    query.set("operator_external_id", params.operator_external_id);
  const qs = query.toString();
  return apiRequest<EnforcementCase[]>(
    `/enforcement/cases${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function createEnforcementCase(
  token: string,
  externalId: string,
  data: CreateEnforcementCaseInput,
) {
  return apiRequest<EnforcementCase>(`/operators/${externalId}/enforcement`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function getEnforcementCase(token: string, caseId: string) {
  return apiRequest<EnforcementCase & {
    operator: { id: string; external_id: string; trading_name: string };
  }>(`/enforcement/cases/${caseId}`, { token });
}

export async function addEnforcementAction(
  token: string,
  caseId: string,
  data: {
    action_type: string;
    details?: string;
    fine_amount?: number;
  },
) {
  return apiRequest(`/enforcement/cases/${caseId}/actions`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function resolveEnforcementCase(
  token: string,
  caseId: string,
  notes?: string,
) {
  return apiRequest<EnforcementCase>(`/enforcement/cases/${caseId}/resolve`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ notes }),
  });
}

export async function deleteEnforcementCase(token: string, caseId: string) {
  return apiRequest<{ success: boolean }>(`/enforcement/cases/${caseId}`, {
    method: "DELETE",
    token,
  });
}

export async function requestEnforcementDocuments(
  token: string,
  caseId: string,
  data: { documents: string; due_by?: string; notes?: string },
) {
  return apiRequest<EnforcementCase>(`/enforcement/cases/${caseId}/request-documents`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function getEnforcementWarnings(
  token: string,
  params?: { operator_external_id?: string },
) {
  const query = new URLSearchParams();
  if (params?.operator_external_id) {
    query.set("operator_external_id", params.operator_external_id);
  }
  const qs = query.toString();
  return apiRequest<EnforcementWarning[]>(
    `/enforcement/cases/warnings/list${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function getOperatorEnforcementWarnings(
  token: string,
  externalId: string,
) {
  return apiRequest<EnforcementWarning[]>(
    `/operators/${externalId}/enforcement/warnings`,
    { token },
  );
}

export async function revokeApiCredential(
  token: string,
  siteId: string,
  credentialId: string,
) {
  return apiRequest(
    `/operator-sites/${siteId}/credentials/${credentialId}/revoke`,
    { method: "POST", token },
  );
}

export async function uploadOperatorDocument(
  token: string,
  externalId: string,
  formData: FormData,
) {
  const response = await fetch(
    `${API_URL}/operators/${externalId}/documents`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    if (response.status === 401) {
      forceLogout("expired");
    }
    const message =
      data?.message ?? data?.error ?? `Upload failed (${response.status})`;
    throw new ApiError(
      Array.isArray(message) ? message.join(", ") : String(message),
      response.status,
    );
  }
  return data;
}

export async function getOperatorEnforcement(token: string, externalId: string) {
  return apiRequest<EnforcementCase[]>(
    `/operators/${externalId}/enforcement`,
    { token },
  );
}

export async function getOperatorDocuments(token: string, externalId: string) {
  return apiRequest<DocumentItem[]>(
    `/operators/${externalId}/documents`,
    { token },
  );
}

export async function getComplianceOverview(token: string) {
  return apiRequest<ComplianceOverview>("/compliance/overview", { token });
}

export async function getDashboardAlerts(token: string) {
  return apiRequest<DashboardAlerts>("/dashboard/alerts", { token });
}

export interface NavBadges {
  submissions: number;
  compliance: number;
  enforcement: number;
  payments: number;
}

export async function getNavBadges(token: string) {
  return apiRequest<NavBadges>("/dashboard/nav-badges", { token });
}

export async function getNotifications(token: string) {
  return apiRequest<NotificationsResponse>("/notifications", { token });
}

export async function getExtendedDashboardStats(token: string) {
  return apiRequest<{
    active_licences: number;
    compliance_rate: number;
    total_annual_ggr: string;
    total_tax_paid: string;
    total_tax_due: string;
  }>("/dashboard/stats", { token });
}

export type DashboardCharts = {
  ggr_trend: Array<{ month: string; ggr: number; tax: number }>;
  operator_status: Array<{ name: string; value: number; color: string }>;
  compliance_breakdown: Array<{ name: string; value: number; color: string }>;
  metrics: {
    compliance_rate: number;
    tax_collection_rate: number;
    active_share: number;
    expiring_licences: number;
  };
};

export async function getDashboardCharts(token: string) {
  return apiRequest<DashboardCharts>("/dashboard/charts", { token });
}

export type DashboardPerformance = {
  from: string;
  to: string;
  metrics: {
    compliance_rate: number;
    tax_collection_rate: number;
    payment_success_rate: number;
    expiring_licences: number;
    revenue: string;
    tax_collected: string;
    payments_completed: number;
  };
};

export async function getDashboardPerformance(
  token: string,
  params: { from: string; to: string },
) {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
  });
  return apiRequest<DashboardPerformance>(
    `/dashboard/performance?${query.toString()}`,
    { token },
  );
}

export async function getLiveActivity(
  token: string,
  params?: { operator_external_id?: string; limit?: number },
) {
  const query = new URLSearchParams();
  if (params?.operator_external_id) {
    query.set("operator_external_id", params.operator_external_id);
  }
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiRequest<{ items: LiveFeedItem[] }>(
    `/live/activity${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function getLiveCounters(
  token: string,
  operatorExternalId?: string,
) {
  const qs = operatorExternalId
    ? `?operator_external_id=${encodeURIComponent(operatorExternalId)}`
    : "";
  return apiRequest<LiveCounters>(`/live/counters${qs}`, { token });
}

export type LiveFeedItem = {
  id: string;
  operator_id: string;
  operator_external_id: string;
  operator_name: string;
  event_type: string;
  summary: string;
  amount: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
};

export type LiveCounters = {
  date: string;
  tickets_today: number;
  revenue_today: string;
  tax_earmarked_today?: string;
  gateway_payments_today?: number;
  scope: "global" | "operator";
  operator_external_id: string | null;
};

export async function operatorWarning(token: string, externalId: string, details?: string) {
  return apiRequest(`/operators/${externalId}/actions/warning`, {
    method: "POST",
    token,
    body: JSON.stringify({ details }),
  });
}

export async function operatorSuspend(token: string, externalId: string, details?: string) {
  return apiRequest(`/operators/${externalId}/actions/suspend`, {
    method: "POST",
    token,
    body: JSON.stringify({ details }),
  });
}

export async function getUsers(token: string) {
  return apiRequest<StaffUser[]>("/users", { token });
}

export async function createUser(
  token: string,
  data: { email: string; password: string; full_name: string; role: string },
) {
  return apiRequest("/users", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  token: string,
  id: string,
  data: Partial<{ full_name: string; role: string; is_active: boolean }>,
) {
  return apiRequest(`/users/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });
}

export async function getOperatorSites(token: string, externalId: string) {
  return apiRequest<
    Array<{
      id: string;
      domain: string;
      site_name: string;
      api_credentials: Array<{ id: string; api_key_prefix: string; is_active: boolean }>;
    }>
  >(`/operators/${externalId}/sites`, { token });
}

export async function generateApiCredential(token: string, siteId: string) {
  return apiRequest<{ api_key: string; hmac_secret: string }>(
    `/operator-sites/${siteId}/credentials`,
    { method: "POST", token },
  );
}

export interface AuditLogPage {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getAuditLogs(
  token: string,
  params?: {
    user_id?: string;
    action?: string;
    category?: "auth" | "platform";
    from?: string;
    to?: string;
    page?: number;
    page_size?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.user_id) query.set("user_id", params.user_id);
  if (params?.action) query.set("action", params.action);
  if (params?.category) query.set("category", params.category);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const qs = query.toString();
  return apiRequest<AuditLogPage>(`/audit-logs${qs ? `?${qs}` : ""}`, { token });
}

export async function wipeAuditLogs(token: string) {
  return apiRequest<{ deleted_count: number }>("/audit-logs", {
    method: "DELETE",
    token,
  });
}

export function downloadUrl(path: string, _token: string) {
  return `${API_URL}${path}`;
}

export async function downloadWithAuth(token: string, path: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401) forceLogout("expired");
    throw new ApiError("Download failed", response.status);
  }
  return response.blob();
}

export type ReportPreviewSummary = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type ReportPreviewChart = {
  type: "bar" | "pie" | "line";
  x_key: string;
  series: Array<{ key: string; label: string; color?: string }>;
  data: Array<Record<string, string | number>>;
};

export type ReportPreview = {
  title: string;
  headers: string[];
  rows: Array<Record<string, string | number>>;
  row_count: number;
  summary: ReportPreviewSummary[];
  chart: ReportPreviewChart | null;
  table_view: string;
};

export type ReportPreviewResponse = {
  slug: string;
  category: string;
  preview: ReportPreview;
};

export type ReportDefinition = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  required_role: string;
  parameters_schema: {
    fields?: Array<{
      name: string;
      type: string;
      label: string;
      default?: string | number;
      min?: number;
      max?: number;
    }>;
    defaults?: Record<string, unknown>;
  };
  is_scheduled: boolean;
  schedule_recipients: string[] | null;
  schedule_cadence: string | null;
};

export type ReportRun = {
  id: string;
  slug: string;
  title: string;
  category?: string;
  parameters: Record<string, unknown>;
  format: "csv" | "pdf";
  status: string;
  error_message: string | null;
  is_scheduled: boolean;
  completed_at: string | null;
  created_at: string;
  requested_by: { full_name: string; email: string } | null;
};

export async function getReports(token: string) {
  return apiRequest<ReportDefinition[]>("/reports", { token });
}

export async function getReport(token: string, slug: string) {
  return apiRequest<ReportDefinition>(`/reports/${slug}`, { token });
}

export async function getReportPreview(
  token: string,
  slug: string,
  parameters: Record<string, string> = {},
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== "") query.set(key, value);
  }
  const qs = query.toString();
  return apiRequest<ReportPreviewResponse>(
    `/reports/${slug}/preview${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function getScheduledReports(token: string) {
  return apiRequest<ReportDefinition[]>("/reports/scheduled", { token });
}

export async function getReportRuns(token: string, limit = 50) {
  return apiRequest<ReportRun[]>(`/reports/runs?limit=${limit}`, { token });
}

export async function getReportRun(token: string, runId: string) {
  return apiRequest<ReportRun>(`/reports/runs/${runId}`, { token });
}

export async function runReport(
  token: string,
  slug: string,
  data: { format: "csv" | "pdf"; parameters?: Record<string, unknown> },
) {
  return apiRequest<ReportRun>(`/reports/${slug}/run`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function downloadReportRun(token: string, runId: string) {
  const response = await fetch(`${API_URL}/reports/runs/${runId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401) forceLogout("expired");
    throw new ApiError("Download failed", response.status);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (data.download_url) {
      window.open(data.download_url, "_blank");
      return;
    }
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `report-${runId}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface RegionalCountyCommercial {
  county: string;
  region: string | null;
  operator_count: number;
  annual_ggr: number;
}

export interface RegionalCountyPerformance extends RegionalCountyCommercial {
  sessions: number;
  play_safe: number;
  sessions_change_pct: number | null;
  play_safe_change_pct: number | null;
  ggr_ytd_change_pct: number | null;
}

export interface RegionalNationalSummary {
  total_sessions: number;
  sessions_change_pct: number | null;
  sessions_change_label: string;
  total_sessions_ytd: number;
  sessions_ytd_change_pct: number | null;
  sessions_ytd_change_label: string;
  total_annual_ggr: number;
  ggr_ytd: number;
  ggr_ytd_change_pct: number | null;
  ggr_ytd_change_label: string;
  ggr_recent_change_pct: number | null;
  ggr_recent_change_label: string;
  active_counties: number;
  total_counties: number;
  highest_growth_county: {
    county: string;
    change_pct: number | null;
    metric: string;
  } | null;
}

export interface RegionalOverview {
  days: number;
  date_range: {
    from: string;
    to: string;
    label: string;
  };
  national_summary: RegionalNationalSummary;
  county_performance: RegionalCountyPerformance[];
  counties: RegionalCountyCommercial[];
  play_safe_by_county: Array<{ county: string; count: number }>;
  self_exclusion_by_county: Array<{ county: string; count: number }>;
  peak_time_heatmap: {
    matrix: Record<string, number[]>;
    day_labels: string[];
    hours: number[];
  };
  stake_band_distribution: Array<{ band: string; count: number }>;
  age_band_distribution: Array<{ band: string; count: number }>;
  disclaimer: string;
}

export interface RegionalCountyOperatorPerformance {
  external_id: string;
  trading_name: string;
  compliance_status: string;
  annual_ggr: number;
  period_ggr: number;
  period_tax_paid: number;
  tax_due: number;
  tax_outstanding: number;
}

export interface RegionalCountyDetail {
  county: string;
  days: number;
  date_range: {
    from: string;
    to: string;
    label: string;
  };
  operators: Array<{
    external_id: string;
    trading_name: string;
    annual_ggr: string | null;
    compliance_status: string;
  }>;
  operator_performance: RegionalCountyOperatorPerformance[];
  period_totals: {
    ggr: number;
    tax_paid: number;
    tax_outstanding: number;
  };
  operator_count: number;
  annual_ggr_total: number;
  play_safe_activations: number;
  self_exclusion_requests: number;
  session_count: number;
  sessions_change_pct: number | null;
  sessions_change_label: string;
  sessions_ytd_change_pct: number | null;
  play_safe_change_pct: number | null;
  play_safe_change_label: string;
  self_exclusion_change_pct: number | null;
  self_exclusion_change_label: string;
  ggr_ytd: number;
  ggr_ytd_change_pct: number | null;
  ggr_ytd_change_label: string;
  peak_time_heatmap: Record<string, number[]>;
  stake_band_distribution: Record<string, number>;
  age_band_distribution: Record<string, number>;
  daily_trend: Array<{
    date: string;
    play_safe_activations: number;
    self_exclusion_requests: number;
    session_count: number;
  }>;
  disclaimer: string;
}

export async function getRegionalOverview(
  token: string,
  params?: { days?: number; from?: string; to?: string },
) {
  const search = new URLSearchParams();
  if (params?.from && params?.to) {
    search.set("from", params.from);
    search.set("to", params.to);
  } else {
    search.set("days", String(params?.days ?? 30));
  }
  return apiRequest<RegionalOverview>(`/regional/overview?${search.toString()}`, { token });
}

export async function getRegionalCounty(
  token: string,
  county: string,
  params?: { days?: number; from?: string; to?: string },
) {
  const search = new URLSearchParams();
  if (params?.from && params?.to) {
    search.set("from", params.from);
    search.set("to", params.to);
  } else {
    search.set("days", String(params?.days ?? 30));
  }
  return apiRequest<RegionalCountyDetail>(
    `/regional/counties/${encodeURIComponent(county)}?${search.toString()}`,
    { token },
  );
}

export async function exportRegionalDataset(
  token: string,
  params?: { days?: number; from?: string; to?: string },
) {
  const search = new URLSearchParams();
  if (params?.from && params?.to) {
    search.set("from", params.from);
    search.set("to", params.to);
  } else {
    search.set("days", String(params?.days ?? 30));
  }
  const response = await fetch(`${API_URL}/regional/export?${search.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401) forceLogout("expired");
    throw new ApiError("Export failed", response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "gra-regional-export.csv";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type SystemSettings = {
  tax_rate: number;
  smtp: {
    host: string | null;
    port: number | null;
    user: string | null;
    from: string | null;
    configured: boolean;
  };
  treasury_account_ref: string | null;
  can_edit: boolean;
};

export async function getSystemSettings(token: string) {
  return apiRequest<SystemSettings>("/settings/system", { token });
}

export async function updateSystemSettings(
  token: string,
  data: Record<string, unknown>,
) {
  return apiRequest<SystemSettings>("/settings/system", {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });
}

export type PaymentsOverview = {
  payments_today: number;
  failed_today: number;
  success_rate: number;
  gross_today: string;
  tax_earmarked_today: string;
  tax_withdrawn_today: string;
  earmarked_balance: string;
  earmarked_entry_count: number;
  tax_rate: number;
  open_aml_alerts: number;
  pending_withdrawal_batches: number;
};

export type PaymentTransaction = {
  id: string;
  external_transaction_id: string;
  ticket_reference: string | null;
  gross_amount: string;
  operator_amount: string;
  tax_amount: string;
  tax_rate: string;
  gateway_fee_rate: string;
  gateway_fee_amount: string;
  operator_net: string;
  currency: string;
  status: string;
  kyc_status: string;
  aml_risk_score: number;
  county: string | null;
  completed_at: string | null;
  created_at: string;
  operator_external_id?: string;
  operator_name?: string;
  has_aml_alert?: boolean;
};

export async function getPaymentsOverview(token: string) {
  return apiRequest<PaymentsOverview>("/payments/overview", { token });
}

export async function getPaymentTransactions(
  token: string,
  params?: {
    status?: string;
    operator_external_id?: string;
    search?: string;
    aml_flag?: boolean;
    limit?: number;
  },
) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.operator_external_id) {
    query.set("operator_external_id", params.operator_external_id);
  }
  if (params?.search) query.set("search", params.search);
  if (params?.aml_flag) query.set("aml_flag", "true");
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiRequest<PaymentTransaction[]>(
    `/payments/transactions${qs ? `?${qs}` : ""}`,
    { token },
  );
}

export async function getTaxEscrowSummary(token: string) {
  return apiRequest<{
    earmarked_balance: string;
    earmarked_count: number;
    withdrawn_total: string;
    withdrawn_count: number;
    reversed_total: string;
    withdrawal_batches: Array<{
      id: string;
      business_date: string;
      total_amount: string;
      destination_account_ref: string;
      status: string;
      gateway_batch_id: string | null;
      completed_at: string | null;
    }>;
  }>("/payments/tax-escrow/summary", { token });
}

export async function getTaxEscrowEntries(
  token: string,
  params?: { status?: string },
) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  return apiRequest<
    Array<{
      id: string;
      tax_amount: string;
      status: string;
      earmarked_at: string;
      operator_external_id: string;
      operator_name: string;
      gross_amount: string;
    }>
  >(`/payments/tax-escrow${qs ? `?${qs}` : ""}`, { token });
}

export async function getAmlAlerts(token: string, status?: string) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<
    Array<{
      id: string;
      alert_type: string;
      severity: string;
      status: string;
      details: Record<string, unknown> | null;
      created_at: string;
      operator: { external_id: string; trading_name: string };
      payment_transaction: {
        id: string;
        external_transaction_id: string;
        gross_amount: string;
        kyc_status: string;
        aml_risk_score: number;
      } | null;
    }>
  >(`/payments/aml-alerts${query}`, { token });
}

export async function updateAmlAlert(
  token: string,
  id: string,
  status: "reviewed" | "escalated" | "closed",
) {
  return apiRequest(`/payments/aml-alerts/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}

export async function getWithdrawalBatches(token: string) {
  return apiRequest<
    Array<{
      id: string;
      business_date: string;
      total_amount: string;
      destination_account_ref: string;
      status: string;
      gateway_batch_id: string | null;
      completed_at: string | null;
    }>
  >("/payments/withdrawals", { token });
}

export async function escalateAmlToEnforcement(token: string, alertId: string) {
  return apiRequest<{
    alert_id: string;
    enforcement_case_id: string;
    case_number: string;
  }>(`/payments/aml-alerts/${alertId}/escalate-to-enforcement`, {
    method: "POST",
    token,
  });
}

export async function getPaymentOperatorStats(token: string) {
  return apiRequest<
    Array<{
      operator_external_id: string;
      trading_name: string;
      transaction_count: number;
      failed_count: number;
      failure_rate: number;
      gross_total: string;
      gateway_fee_rate: number;
      gateway_fee_total: string;
      tax_total: string;
      operator_net_total: string;
    }>
  >("/payments/operator-stats", { token });
}

export async function initiateWithdrawal(token: string, businessDate?: string) {
  return apiRequest<{
    id: string;
    business_date: string;
    total_amount: string;
    status: string;
    entry_count: number;
  }>("/payments/withdrawals", {
    method: "POST",
    token,
    body: JSON.stringify({ business_date: businessDate }),
  });
}
