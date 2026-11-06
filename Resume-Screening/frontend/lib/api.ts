export interface Company {
  id: string;
  name: string;
  email: string;
  contact_person: string | null;
  phone: string | null;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  city: string | null;
}

export type CompanyProfileUpdate = Pick<
  Company,
  | "name"
  | "contact_person"
  | "phone"
  | "industry"
  | "company_size"
  | "website"
  | "city"
>;

export interface Event {
  id: string;
  company_id: string;
  title: string;
  job_role: string;
  department: string | null;
  job_description: string | null;
  location: string | null;
  employment_type: "full_time" | "internship" | "contract" | null;
  min_exp_years: number;
  openings: number;
  start_date: string | null;
  end_date: string | null;
  status: "draft" | "open" | "closed";
  created_at: string;
  updated_at: string;
}

export interface EventInput {
  title: string;
  job_role: string;
  department?: string;
  job_description?: string;
  location?: string;
  employment_type?: Event["employment_type"];
  min_exp_years: number;
  openings: number;
  start_date?: string;
  end_date?: string;
}

export interface ResumeCandidate {
  candidate_id: string;
  candidate_name: string;
  filename: string;
  status: string;
}

export interface CandidateSearchResult extends ResumeCandidate {
  email?: string | null;
  phone?: string | null;
  experience_years?: string | null;
  relevant_context: string;
  matching_explanation: string;
}

export interface SearchResponse {
  query: string;
  results: CandidateSearchResult[];
}

interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  company: Company;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const TOKEN_KEY = "talentdesk_access_token";

export function getAccessToken(): string | null {
  return typeof window === "undefined"
    ? null
    : window.sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (authenticated) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    const fieldErrors: Record<string, string> = {};
    try {
      const body = (await response.json()) as {
        detail?: string | ValidationIssue[];
      };
      if (typeof body.detail === "string") {
        message = body.detail;
        if (/end date must be at least one day after/i.test(body.detail)) {
          fieldErrors.end_date = body.detail;
        }
      } else if (Array.isArray(body.detail)) {
        const generalMessages: string[] = [];
        for (const issue of body.detail) {
          const field = issue.loc?.at(-1);
          const issueMessage = issue.msg?.replace(/^Value error,\s*/i, "");
          if (typeof field === "string" && issue.msg) {
            if (field !== "body" && field !== "__root__") {
              fieldErrors[field] ??= issueMessage ?? issue.msg;
            } else if (issueMessage) {
              generalMessages.push(issueMessage);
            }
          }
        }
        message =
          generalMessages.join(" ") ||
          (Object.keys(fieldErrors).length > 0
            ? "Please correct the highlighted fields."
            : "Some submitted fields are invalid.");
      }
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    if (response.status === 401 && authenticated) clearAccessToken();
    throw new ApiError(message, response.status, fieldErrors);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function registerCompany(
  details: Record<string, string>,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/api/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    },
    false,
  );
}

export async function loginCompany(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    false,
  );
}

export function getCompany(): Promise<Company> {
  return request<Company>("/api/companies/me");
}

export function updateCompany(
  details: CompanyProfileUpdate,
): Promise<Company> {
  return request<Company>("/api/companies/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
}

export async function getEvents(): Promise<Event[]> {
  const response = await request<{ events: Event[] }>("/api/events");
  return response.events;
}

export function createEvent(details: EventInput): Promise<Event> {
  const payload = {
    ...details,
    start_date: details.start_date || null,
    end_date: details.end_date || null,
  };
  return request<Event>("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getEvent(eventId: string): Promise<Event> {
  return request<Event>(`/api/events/${encodeURIComponent(eventId)}`);
}

export function updateEvent(
  eventId: string,
  details: Partial<EventInput>,
): Promise<Event> {
  const payload = {
    ...details,
    ...(details.start_date !== undefined
      ? { start_date: details.start_date || null }
      : {}),
    ...(details.end_date !== undefined
      ? { end_date: details.end_date || null }
      : {}),
  };
  return request<Event>(`/api/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function transitionEventStatus(
  eventId: string,
  status: Event["status"],
): Promise<Event> {
  return request<Event>(`/api/events/${encodeURIComponent(eventId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function deleteEvent(eventId: string): Promise<void> {
  return request<void>(`/api/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}

export async function getResumes(eventId: string): Promise<ResumeCandidate[]> {
  const response = await request<{ resumes: ResumeCandidate[] }>(
    `/api/events/${encodeURIComponent(eventId)}/resumes`,
  );
  return response.resumes;
}

export function uploadResumes(
  eventId: string,
  files: File[],
): Promise<{ results: ResumeCandidate[] }> {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  return request(`/api/events/${encodeURIComponent(eventId)}/resumes`, {
    method: "POST",
    body,
  });
}

export function deleteResume(eventId: string, candidateId: string): Promise<void> {
  return request<void>(
    `/api/events/${encodeURIComponent(eventId)}/resumes/${encodeURIComponent(candidateId)}`,
    { method: "DELETE" },
  );
}

export async function getResumePdf(
  eventId: string,
  candidateId: string,
): Promise<Blob> {
  const token = getAccessToken();
  const response = await fetch(
    `${API_URL}/api/events/${encodeURIComponent(eventId)}/resumes/${encodeURIComponent(candidateId)}/file`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!response.ok) {
    let message = `Could not load resume PDF (${response.status}).`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Retain the status-based message for non-JSON responses.
    }
    if (response.status === 401) clearAccessToken();
    throw new ApiError(message, response.status);
  }
  return response.blob();
}

export function searchCandidates(
  eventId: string,
  query: string,
): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/events/${encodeURIComponent(eventId)}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
}
