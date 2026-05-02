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
    let msg = `Request failed: ${res.status}`;
    if (body && typeof body === "object" && "error" in body) {
      const e = (body as { error: unknown }).error;
      if (typeof e === "string" && e.length > 0) msg = e;
    }
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

/**
 * Compress an image File to a JPEG or WebP data URL bounded by max width and
 * total bytes. Resizes by power-of-two on the canvas long edge until the
 * encoded payload fits under SCREENSHOT_MAX_BYTES, then drops quality.
 * Returns the original (just base64-encoded) if it already fits without
 * resampling.
 */
export async function compressImageToDataUrl(
  file: File,
  opts: { maxWidth?: number; maxBytes?: number; mime?: "image/jpeg" | "image/webp" } = {},
): Promise<string> {
  const maxWidth = opts.maxWidth ?? 1600;
  const maxBytes = opts.maxBytes ?? SCREENSHOT_MAX_BYTES;
  const mime = opts.mime ?? "image/webp";

  const original = await fileToDataUrl(file);
  // Already fits and is a supported in-place format → keep bytes as-is.
  if (
    original.length * 0.75 <= maxBytes &&
    SCREENSHOT_ALLOWED_TYPES.includes(file.type)
  ) {
    return original;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not decode image"));
    i.src = original;
  });

  let width = Math.min(img.naturalWidth || img.width, maxWidth);
  let height = Math.round(
    ((img.naturalHeight || img.height) * width) / (img.naturalWidth || img.width),
  );
  let quality = 0.85;

  for (let attempt = 0; attempt < 8; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL(mime, quality);
    if (out.length * 0.75 <= maxBytes) return out;
    if (quality > 0.5) {
      quality -= 0.15;
    } else {
      width = Math.round(width * 0.75);
      height = Math.round(height * 0.75);
      quality = 0.8;
    }
  }
  throw new Error("Could not compress screenshot under size cap");
}

export const SCREENSHOT_MAX_BYTES = 500 * 1024;
// Pre-compression cap. Anything bigger than this on disk is rejected before
// we even try to resample, to avoid hanging the browser on huge inputs.
export const SCREENSHOT_INPUT_MAX_BYTES = 10 * 1024 * 1024;
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
