import type { AuthResponse } from "@kenji-government/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
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

  return parseResponse<T>(response);
}

export async function loginRequest(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

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
  gross_gaming_revenue: string;
  tax_due: string;
  tax_paid: string;
  tax_outstanding: string;
  submitted_at: string | null;
  operator?: { external_id: string; trading_name: string };
  reporting_period?: { label: string };
}

export interface EnforcementCase {
  id: string;
  case_number: string;
  case_type: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
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
  user?: { email: string; full_name: string; role: string };
}

export async function getSubmissions(token: string, status?: string) {
  const qs = status ? `?status=${status}` : "";
  return apiRequest<SubmissionItem[]>(`/submissions${qs}`, { token });
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
  return apiRequest(`/submissions/${id}/review`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status, notes }),
  });
}

export async function getEnforcementCases(
  token: string,
  params?: { status?: string; operator_external_id?: string },
) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
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
  data: { title: string; description?: string; case_type: string },
) {
  return apiRequest(`/operators/${externalId}/enforcement`, {
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

export async function getExtendedDashboardStats(token: string) {
  return apiRequest<{
    active_licences: number;
    compliance_rate: number;
    total_annual_ggr: string;
    total_tax_paid: string;
    total_tax_due: string;
  }>("/dashboard/stats", { token });
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

export async function getAuditLogs(
  token: string,
  params?: { user_id?: string; action?: string; from?: string; to?: string },
) {
  const query = new URLSearchParams();
  if (params?.user_id) query.set("user_id", params.user_id);
  if (params?.action) query.set("action", params.action);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const qs = query.toString();
  return apiRequest<AuditLogItem[]>(`/audit-logs${qs ? `?${qs}` : ""}`, { token });
}

export function downloadUrl(path: string, _token: string) {
  return `${API_URL}${path}`;
}

export async function downloadWithAuth(token: string, path: string) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError("Download failed", response.status);
  return response.blob();
}
