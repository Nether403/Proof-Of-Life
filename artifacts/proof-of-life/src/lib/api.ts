// Hand-written typed API client for the Proof of Life backend.
// All endpoints are mounted under /api on the same origin.

export interface Milestone {
  id: number;
  project_id: number;
  sort_order: number;
  occurred_at: string;
  type: "breakthrough" | "blocker" | "update" | "milestone" | string;
  title: string;
  description: string;
  blocker: boolean;
  breakthrough: boolean;
  screenshot_data: string | null;
  created_at: string;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  builder_name: string;
  one_liner: string;
  starting_state: string;
  current_state: string;
  replit_url: string;
  demo_url: string;
  start_time: string | null;
  published: boolean;
  generated_summary: string;
  generated_demo_script: string;
  created_at: string;
  milestones: Milestone[];
}

export interface ProjectWithToken extends Project {
  edit_token: string;
}

export interface CreateProjectBody {
  title: string;
  builder_name?: string;
  one_liner?: string;
  starting_state?: string;
  replit_url?: string;
  demo_url?: string;
}

export interface UpdateProjectBody {
  title?: string;
  builder_name?: string;
  one_liner?: string;
  starting_state?: string;
  current_state?: string;
  replit_url?: string;
  demo_url?: string;
  published?: boolean;
  generated_summary?: string;
  generated_demo_script?: string;
}

export interface MilestoneInput {
  title: string;
  description?: string;
  type?: "breakthrough" | "blocker" | "update" | "milestone";
  blocker?: boolean;
  breakthrough?: boolean;
  occurred_at?: string;
  sort_order?: number;
  screenshot_data?: string | null;
}

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");

async function request<T>(
  path: string,
  init: RequestInit = {},
  editToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (editToken) headers["x-edit-token"] = editToken;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const msg =
      (body && typeof body === "object" && "error" in body && String((body as { error: unknown }).error)) ||
      `Request failed: ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ----- Public reads -----

export const getExampleProject = () =>
  request<Project>("/projects/example");

export const getProjectBySlug = (slug: string) =>
  request<Project>(`/projects/by-slug/${encodeURIComponent(slug)}`);

// ----- Authoring (requires edit token, returned on create) -----

export const createProject = (body: CreateProjectBody) =>
  request<ProjectWithToken>("/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getProjectForEdit = (id: number, editToken: string) =>
  request<ProjectWithToken>(`/projects/${id}`, {}, editToken);

export const updateProject = (
  id: number,
  editToken: string,
  body: UpdateProjectBody,
) =>
  request<ProjectWithToken>(
    `/projects/${id}`,
    { method: "PATCH", body: JSON.stringify(body) },
    editToken,
  );

export const deleteProject = (id: number, editToken: string) =>
  request<{ ok: true }>(`/projects/${id}`, { method: "DELETE" }, editToken);

// ----- Milestones -----

export const createMilestone = (
  projectId: number,
  editToken: string,
  body: MilestoneInput,
) =>
  request<Milestone>(
    `/projects/${projectId}/milestones`,
    { method: "POST", body: JSON.stringify(body) },
    editToken,
  );

export const updateMilestone = (
  projectId: number,
  milestoneId: number,
  editToken: string,
  body: Partial<MilestoneInput>,
) =>
  request<Milestone>(
    `/projects/${projectId}/milestones/${milestoneId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    editToken,
  );

export const deleteMilestone = (
  projectId: number,
  milestoneId: number,
  editToken: string,
) =>
  request<{ ok: true }>(
    `/projects/${projectId}/milestones/${milestoneId}`,
    { method: "DELETE" },
    editToken,
  );

// ----- AI generation -----

export const generateSummary = (projectId: number, editToken: string) =>
  request<{ generated_summary: string }>(
    `/projects/${projectId}/generate-summary`,
    { method: "POST" },
    editToken,
  );

export const generateDemoScript = (projectId: number, editToken: string) =>
  request<{ generated_demo_script: string }>(
    `/projects/${projectId}/generate-demo-script`,
    { method: "POST" },
    editToken,
  );

// ----- Utilities -----

/**
 * Read a File object and convert to a data URL.
 * Caller must validate type and size before sending.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export const SCREENSHOT_MAX_BYTES = 500 * 1024;
export const SCREENSHOT_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function shareLinkForSlug(slug: string): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${base}${import.meta.env.BASE_URL}p/${slug}`;
}

export function localStorageKeyForProject(id: number): string {
  return `proof-of-life:edit-token:${id}`;
}
