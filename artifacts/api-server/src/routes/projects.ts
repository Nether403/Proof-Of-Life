import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { projectsTable, milestonesTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { z } from "zod";
import { makeSlug, makeEditToken } from "../lib/ids";
import { getAnthropic, AI_MODEL } from "../lib/ai";

const router: IRouter = Router();

// Slug of the *featured* example surfaced by /api/projects/example.
// Must stay in sync with META_CASE_SLUG in lib/seed.ts and the
// SEEDED_EXAMPLE_SLUG constant in the proof-of-life frontend.
const EXAMPLE_SLUG = "proof-of-life-builds-itself";

// Seeded example projects whose edit_token is hardcoded in the public
// repo. These are read-only — no mutation route is allowed to touch
// them, even with a valid token. Keep in sync with seed.ts slugs.
const LOCKED_SLUGS = new Set<string>([
  "proof-of-life-builds-itself",
  "alive-or-dead-the-deadwords-resurrection",
]);

async function rejectIfLocked(
  res: Response,
  projectId: number,
): Promise<boolean> {
  const [project] = await db
    .select({ slug: projectsTable.slug })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (project && LOCKED_SLUGS.has(project.slug)) {
    res.status(403).json({ error: "Seeded example projects are locked." });
    return true;
  }
  return false;
}

// ----- helpers -----

async function loadFullProject(projectId: number) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) return null;
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.project_id, projectId))
    .orderBy(asc(milestonesTable.sort_order), asc(milestonesTable.occurred_at));
  return { ...project, milestones };
}

async function loadFullProjectBySlug(slug: string) {
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.slug, slug));
  if (!project) return null;
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.project_id, project.id))
    .orderBy(asc(milestonesTable.sort_order), asc(milestonesTable.occurred_at));
  return { ...project, milestones };
}

function stripEditToken<T extends { edit_token?: string }>(p: T) {
  const { edit_token, ...rest } = p;
  void edit_token;
  return rest;
}

async function requireEditToken(
  req: Request,
  res: Response,
  projectId: number,
): Promise<boolean> {
  const token =
    (req.query.token as string | undefined) ??
    (req.headers["x-edit-token"] as string | undefined);
  if (!token) {
    res.status(401).json({ error: "edit_token required" });
    return false;
  }
  const [project] = await db
    .select({ id: projectsTable.id, edit_token: projectsTable.edit_token })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return false;
  }
  if (project.edit_token !== token) {
    res.status(403).json({ error: "Invalid edit_token" });
    return false;
  }
  return true;
}

// ----- schemas -----

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  builder_name: z.string().max(200).optional().default(""),
  one_liner: z.string().max(500).optional().default(""),
  starting_state: z.string().max(5000).optional().default(""),
  replit_url: z.string().max(500).optional().default(""),
  demo_url: z.string().max(500).optional().default(""),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  builder_name: z.string().max(200).optional(),
  one_liner: z.string().max(500).optional(),
  starting_state: z.string().max(5000).optional(),
  current_state: z.string().max(5000).optional(),
  replit_url: z.string().max(500).optional(),
  demo_url: z.string().max(500).optional(),
  published: z.boolean().optional(),
  generated_summary: z.string().max(10000).optional(),
  generated_demo_script: z.string().max(10000).optional(),
});

const milestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  type: z
    .enum(["breakthrough", "blocker", "update", "milestone"])
    .optional()
    .default("update"),
  blocker: z.boolean().optional().default(false),
  breakthrough: z.boolean().optional().default(false),
  occurred_at: z.string().optional(),
  sort_order: z.number().int().optional(),
  screenshot_data: z.string().nullable().optional(),
});

const milestoneUpdateSchema = milestoneSchema.partial();

// ----- routes -----

// Get the seeded example project (public)
router.get("/projects/example", async (_req, res) => {
  const project = await loadFullProjectBySlug(EXAMPLE_SLUG);
  if (!project) {
    res.status(404).json({ error: "Example project not found" });
    return;
  }
  res.json(stripEditToken(project));
});

// Public: get by slug (only if published)
router.get("/projects/by-slug/:slug", async (req, res) => {
  const project = await loadFullProjectBySlug(req.params.slug);
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!project.published) {
    res.status(404).json({ error: "Not published" });
    return;
  }
  res.json(stripEditToken(project));
});

// Create project
router.post("/projects", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  let slug = makeSlug(data.title);
  // Ensure unique
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.slug, slug));
    if (!existing) break;
    slug = makeSlug(data.title);
  }
  const edit_token = makeEditToken();
  const [created] = await db
    .insert(projectsTable)
    .values({
      title: data.title,
      builder_name: data.builder_name ?? "",
      one_liner: data.one_liner ?? "",
      starting_state: data.starting_state ?? "",
      replit_url: data.replit_url ?? "",
      demo_url: data.demo_url ?? "",
      slug,
      edit_token,
      start_time: new Date(),
    })
    .returning();
  res.json({ ...created, milestones: [] });
});

// Get project by id (with edit_token, returns full project including token)
router.get("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  const project = await loadFullProject(id);
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(project);
});

// Update project
router.patch("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  if (await rejectIfLocked(res, id)) return;
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const [updated] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, id))
    .returning();
  const full = await loadFullProject(updated.id);
  res.json(full);
});

// Delete project
router.delete("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  if (await rejectIfLocked(res, id)) return;
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  res.json({ ok: true });
});

// ----- milestones -----

router.post("/projects/:id/milestones", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  if (await rejectIfLocked(res, id)) return;
  const parsed = milestoneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  // Validate screenshot if present
  if (data.screenshot_data) {
    const validation = validateScreenshot(data.screenshot_data);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
  }

  // Determine sort_order if not given
  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const existing = await db
      .select({ sort_order: milestonesTable.sort_order })
      .from(milestonesTable)
      .where(eq(milestonesTable.project_id, id));
    sortOrder =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((m) => m.sort_order)) + 1;
  }

  const [created] = await db
    .insert(milestonesTable)
    .values({
      project_id: id,
      title: data.title,
      description: data.description ?? "",
      type: data.type ?? "update",
      blocker: data.blocker ?? false,
      breakthrough: data.breakthrough ?? false,
      occurred_at: data.occurred_at ? new Date(data.occurred_at) : new Date(),
      sort_order: sortOrder,
      screenshot_data: data.screenshot_data ?? null,
    })
    .returning();
  res.json(created);
});

router.patch("/projects/:id/milestones/:mid", async (req, res) => {
  const id = Number(req.params.id);
  const mid = Number(req.params.mid);
  if (!Number.isFinite(id) || !Number.isFinite(mid)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  if (await rejectIfLocked(res, id)) return;
  const parsed = milestoneUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  if (data.screenshot_data) {
    const validation = validateScreenshot(data.screenshot_data);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
  }
  const updateData: Record<string, unknown> = { ...data };
  if (data.occurred_at) updateData.occurred_at = new Date(data.occurred_at);
  const [updated] = await db
    .update(milestonesTable)
    .set(updateData)
    .where(
      and(eq(milestonesTable.id, mid), eq(milestonesTable.project_id, id)),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/projects/:id/milestones/:mid", async (req, res) => {
  const id = Number(req.params.id);
  const mid = Number(req.params.mid);
  if (!Number.isFinite(id) || !Number.isFinite(mid)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  if (await rejectIfLocked(res, id)) return;
  await db
    .delete(milestonesTable)
    .where(
      and(eq(milestonesTable.id, mid), eq(milestonesTable.project_id, id)),
    );
  res.json({ ok: true });
});

// ----- AI generation -----

router.post("/projects/:id/generate-summary", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  if (await rejectIfLocked(res, id)) return;
  const project = await loadFullProject(id);
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const anthropic = getAnthropic();
  if (!anthropic) {
    res.status(503).json({
      error:
        "AI generation is not configured. The judge briefing must be written manually.",
    });
    return;
  }
  try {
    const text = await generateText(
      anthropic,
      buildSummaryPrompt(project),
      "You are an evidence officer writing a concise, factual judge briefing for a 24-hour buildathon project. Use only the facts provided. Never invent features, metrics, or events. 5-7 sentences. Direct, declarative tone. No marketing fluff.",
    );
    const [updated] = await db
      .update(projectsTable)
      .set({ generated_summary: text })
      .where(eq(projectsTable.id, id))
      .returning();
    res.json({ generated_summary: updated.generated_summary });
  } catch (err) {
    const status = upstreamStatus(err);
    res.status(status).json({
      error:
        status === 503
          ? "AI generation is temporarily unavailable. Please write the briefing manually."
          : "AI generation failed",
      details: String(err),
    });
  }
});

router.post("/projects/:id/generate-demo-script", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await requireEditToken(req, res, id))) return;
  if (await rejectIfLocked(res, id)) return;
  const project = await loadFullProject(id);
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const anthropic = getAnthropic();
  if (!anthropic) {
    res.status(503).json({
      error:
        "AI generation is not configured. The demo script must be written manually.",
    });
    return;
  }
  try {
    const text = await generateText(
      anthropic,
      buildDemoScriptPrompt(project),
      "You are a builder writing a 60-second spoken demo script for a buildathon project. Use only the facts provided. Never invent features. Start with the original dead state, show one breakthrough, end with the current alive state. Use second-person 'you' for the audience. ~150 words.",
    );
    const [updated] = await db
      .update(projectsTable)
      .set({ generated_demo_script: text })
      .where(eq(projectsTable.id, id))
      .returning();
    res.json({ generated_demo_script: updated.generated_demo_script });
  } catch (err) {
    const status = upstreamStatus(err);
    res.status(status).json({
      error:
        status === 503
          ? "AI generation is temporarily unavailable. Please write the demo script manually."
          : "AI generation failed",
      details: String(err),
    });
  }
});

// ----- helpers -----

function upstreamStatus(err: unknown): number {
  const e = err as { status?: number; statusCode?: number } | null;
  const code = e?.status ?? e?.statusCode;
  if (code === 503 || code === 502 || code === 504 || code === 529) return 503;
  if (code === 429) return 429;
  return 500;
}

async function generateText(
  anthropic: NonNullable<ReturnType<typeof getAnthropic>>,
  userPrompt: string,
  system: string,
): Promise<string> {
  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = message.content[0];
  if (block && block.type === "text") return block.text.trim();
  return "";
}

function buildSummaryPrompt(project: {
  title: string;
  builder_name: string;
  one_liner: string;
  starting_state: string;
  current_state: string;
  milestones: Array<{
    title: string;
    description: string;
    blocker: boolean;
    breakthrough: boolean;
    occurred_at: Date | string | null;
  }>;
}): string {
  const facts = [
    `Project title: ${project.title}`,
    `Builder: ${project.builder_name || "unknown"}`,
    `One-liner: ${project.one_liner || "none"}`,
    `Initial Condition (before state): ${project.starting_state || "none"}`,
    `Current Vital Signs (current state): ${project.current_state || "none"}`,
    "",
    "Evidence Timeline (in order):",
    ...project.milestones.map((m, i) => {
      const tag = m.breakthrough
        ? "[BREAKTHROUGH]"
        : m.blocker
        ? "[BLOCKER]"
        : "[UPDATE]";
      return `${i + 1}. ${tag} ${m.title}${m.description ? " — " + m.description : ""}`;
    }),
  ].join("\n");
  return `Write a Judge Briefing for the following project. Use ONLY these facts.\n\n${facts}`;
}

function buildDemoScriptPrompt(project: {
  title: string;
  one_liner: string;
  starting_state: string;
  current_state: string;
  milestones: Array<{
    title: string;
    description: string;
    blocker: boolean;
    breakthrough: boolean;
  }>;
}): string {
  const breakthroughs = project.milestones.filter((m) => m.breakthrough);
  const blockers = project.milestones.filter((m) => m.blocker);
  const facts = [
    `Project: ${project.title}`,
    `One-liner: ${project.one_liner}`,
    `Before state: ${project.starting_state}`,
    `Current state: ${project.current_state}`,
    `Breakthroughs:`,
    ...breakthroughs.map((m) => `- ${m.title}: ${m.description}`),
    `Blockers survived:`,
    ...blockers.map((m) => `- ${m.title}: ${m.description}`),
  ].join("\n");
  return `Write a 60-second spoken demo script. Use only these facts.\n\n${facts}`;
}

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 500 * 1024;

function validateScreenshot(data: string): { ok: true } | { ok: false; error: string } {
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ok: false, error: "Screenshot must be a data URL" };
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) {
    return { ok: false, error: "Only PNG, JPG, or WebP screenshots accepted" };
  }
  // Approx byte size from base64
  const b64 = match[2];
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > MAX_BYTES) {
    return {
      ok: false,
      error: `Evidence file is ${(bytes / 1024).toFixed(0)}KB — must be under 500KB. Compress and try again.`,
    };
  }
  return { ok: true };
}

export default router;
