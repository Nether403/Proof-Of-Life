import { db, projectsTable, milestonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const EXAMPLE_SLUG = "alive-or-dead-the-deadwords-resurrection";
const EXAMPLE_EDIT_TOKEN =
  "example_demo_token_do_not_use_in_real_projects_xyz";

interface SeedMilestone {
  hoursBeforeNow: number;
  type: "update" | "blocker" | "breakthrough" | "milestone";
  title: string;
  description: string;
  blocker: boolean;
  breakthrough: boolean;
}

const SEED_MILESTONES: SeedMilestone[] = [
  {
    hoursBeforeNow: 21.5,
    type: "update",
    title: "Cracked open the corpse",
    description:
      "Cloned the old repo. npm install fails on three deprecated packages. Replaced node-sass and pinned express. App boots to a 500.",
    blocker: false,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 20.25,
    type: "blocker",
    title: "Migration crash traced to NULL author rows",
    description:
      "Found 38 poems with NULL author_id from a 2023 import bug. Wrote a one-shot script to backfill from the user_emails table.",
    blocker: true,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 18.83,
    type: "breakthrough",
    title: "First proof of life: poem #1 renders",
    description:
      "After the backfill, /poems/1 returned actual text instead of a stack trace. Took a screenshot. This is the moment the project stopped being dead.",
    blocker: false,
    breakthrough: true,
  },
  {
    hoursBeforeNow: 15.67,
    type: "breakthrough",
    title: "Auth completely rewritten",
    description:
      "The old session library is unmaintained. Ripped it out, wired up magic-link email auth in 90 minutes. Logged in as myself on a fresh browser.",
    blocker: false,
    breakthrough: true,
  },
  {
    hoursBeforeNow: 12.25,
    type: "blocker",
    title: "Lost an hour to a Postgres collation mismatch",
    description:
      "Production dump used en_US.UTF-8, dev container used C.UTF-8. Indexes were silently broken. Rebuilt with the right collation.",
    blocker: true,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 8,
    type: "breakthrough",
    title: "Public reading room ships",
    description:
      "/room lists all 412 recovered poems with search. Pagination works. No auth required to read.",
    blocker: false,
    breakthrough: true,
  },
  {
    hoursBeforeNow: 2.5,
    type: "update",
    title: "Two real readers log in",
    description:
      "Sent the magic link to two friends. Both logged in without help. One left a comment on a poem from 2022.",
    blocker: false,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 0.5,
    type: "milestone",
    title: "Filed evidence, locked the case",
    description:
      "Wrote the briefing. Recorded a screen capture. Project is alive.",
    blocker: false,
    breakthrough: false,
  },
];

/**
 * Idempotent seed of the public example case file.
 * Runs at server startup. If the example project already exists by slug,
 * does nothing. If absent, creates it with a stable slug and edit_token
 * so /api/projects/example always resolves on a fresh database.
 */
export async function seedExampleProject(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.slug, EXAMPLE_SLUG));
    if (existing) {
      return;
    }
    const now = Date.now();
    const startTime = new Date(now - 22 * 60 * 60 * 1000);
    const [project] = await db
      .insert(projectsTable)
      .values({
        slug: EXAMPLE_SLUG,
        edit_token: EXAMPLE_EDIT_TOKEN,
        title: "Alive or Dead — The DeadWords Resurrection",
        builder_name: "Mara K.",
        one_liner:
          "A 24-hour rescue of an abandoned poetry app, brought back from a corrupted database and a broken auth flow into a working public reading room.",
        starting_state:
          "A two-year-old side project that hadn't booted in 14 months. Database migrations crashed on start. The login page returned a 500. No one knew if any of the saved poems still existed in the dump.",
        current_state:
          "Reading room is live. 412 poems recovered from the SQL dump and re-indexed. New magic-link login works. Public archive at /room loads in under 300ms. Two beta readers logged in tonight without help.",
        replit_url: "https://replit.com/@example/deadwords",
        demo_url: "https://deadwords.example.app",
        start_time: startTime,
        published: true,
      })
      .returning();
    for (let i = 0; i < SEED_MILESTONES.length; i++) {
      const m = SEED_MILESTONES[i];
      await db.insert(milestonesTable).values({
        project_id: project.id,
        sort_order: i,
        occurred_at: new Date(now - m.hoursBeforeNow * 60 * 60 * 1000),
        type: m.type,
        title: m.title,
        description: m.description,
        blocker: m.blocker,
        breakthrough: m.breakthrough,
      });
    }
    logger.info(
      { projectId: project.id, slug: EXAMPLE_SLUG },
      "Seeded example proof-of-life project",
    );
  } catch (err) {
    logger.error({ err }, "Example seed failed (continuing startup)");
  }
}
