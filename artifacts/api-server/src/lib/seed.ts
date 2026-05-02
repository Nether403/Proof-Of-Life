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
  screenshotSvg?: string;
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg.trim(), "utf8").toString("base64")}`;
}

const SVG_FIRST_PROOF = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='#1a1815'/>
  <rect x='0' y='0' width='600' height='28' fill='#0f0d0a'/>
  <circle cx='16' cy='14' r='5' fill='#c34d3a'/>
  <circle cx='32' cy='14' r='5' fill='#cf9a45'/>
  <circle cx='48' cy='14' r='5' fill='#5e9c66'/>
  <text x='300' y='18' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>localhost:3000/poems/1</text>
  <text x='32' y='62' font-family='monospace' font-size='11' fill='#5e9c66'>GET /poems/1 -> 200 OK (217ms)</text>
  <text x='32' y='82' font-family='monospace' font-size='11' fill='#7a7368'>render Poem(id=1, author=mara_k)</text>
  <line x1='32' y1='102' x2='568' y2='102' stroke='#2a2620'/>
  <text x='300' y='168' text-anchor='middle' font-family='Playfair Display, serif' font-size='32' fill='#e8e5dd'>Asylum</text>
  <text x='300' y='196' text-anchor='middle' font-family='Playfair Display, serif' font-style='italic' font-size='13' fill='#b3aa97'>by mara k. — march 2023</text>
  <text x='300' y='244' text-anchor='middle' font-family='Playfair Display, serif' font-size='15' fill='#cfc7b3'>What survived has earned its keep.</text>
  <text x='300' y='268' text-anchor='middle' font-family='Playfair Display, serif' font-size='15' fill='#cfc7b3'>The rest, we let the soil have.</text>
  <line x1='32' y1='320' x2='568' y2='320' stroke='#2a2620'/>
  <text x='32' y='344' font-family='monospace' font-size='10' fill='#7a7368'>recovered_from: dump_2024_03_18.sql · row 1 of 412</text>
</svg>
`;

const SVG_AUTH_REWRITE = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='#1a1815'/>
  <rect x='0' y='0' width='600' height='28' fill='#0f0d0a'/>
  <circle cx='16' cy='14' r='5' fill='#c34d3a'/>
  <circle cx='32' cy='14' r='5' fill='#cf9a45'/>
  <circle cx='48' cy='14' r='5' fill='#5e9c66'/>
  <text x='300' y='18' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>deadwords.example.app/login</text>
  <text x='300' y='86' text-anchor='middle' font-family='Playfair Display, serif' font-size='28' fill='#e8e5dd'>Welcome back, reader</text>
  <text x='300' y='112' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>WE SEND ONE LINK. NO PASSWORDS.</text>
  <rect x='150' y='148' width='300' height='42' fill='none' stroke='#3a342c'/>
  <text x='164' y='174' font-family='monospace' font-size='13' fill='#cfc7b3'>mara@example.com</text>
  <rect x='150' y='204' width='300' height='42' fill='#cf9a45'/>
  <text x='300' y='230' text-anchor='middle' font-family='monospace' font-size='12' fill='#1a1815' font-weight='bold'>SEND ME A LINK</text>
  <text x='300' y='282' text-anchor='middle' font-family='monospace' font-size='10' fill='#5e9c66'>✓ Sent. Check your inbox.</text>
  <text x='300' y='338' text-anchor='middle' font-family='monospace' font-size='9' fill='#7a7368'>old session lib gone · 14 routes simpler</text>
</svg>
`;

const SVG_READING_ROOM = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='#1a1815'/>
  <rect x='0' y='0' width='600' height='28' fill='#0f0d0a'/>
  <circle cx='16' cy='14' r='5' fill='#c34d3a'/>
  <circle cx='32' cy='14' r='5' fill='#cf9a45'/>
  <circle cx='48' cy='14' r='5' fill='#5e9c66'/>
  <text x='300' y='18' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>deadwords.example.app/room</text>
  <text x='32' y='62' font-family='Playfair Display, serif' font-size='22' fill='#e8e5dd'>The Reading Room</text>
  <text x='32' y='82' font-family='monospace' font-size='10' fill='#7a7368'>412 POEMS RECOVERED · INDEXED · SEARCHABLE</text>
  <line x1='32' y1='100' x2='568' y2='100' stroke='#2a2620'/>
  <g font-family='Playfair Display, serif' fill='#cfc7b3'>
    <rect x='32' y='118' width='168' height='75' fill='none' stroke='#3a342c'/>
    <text x='44' y='144' font-size='13'>Asylum</text>
    <text x='44' y='162' font-family='monospace' font-size='9' fill='#7a7368'>MAR 2023</text>
    <rect x='216' y='118' width='168' height='75' fill='none' stroke='#3a342c'/>
    <text x='228' y='144' font-size='13'>Crow at the Window</text>
    <text x='228' y='162' font-family='monospace' font-size='9' fill='#7a7368'>JUL 2022</text>
    <rect x='400' y='118' width='168' height='75' fill='none' stroke='#3a342c'/>
    <text x='412' y='144' font-size='13'>Letters Never Sent</text>
    <text x='412' y='162' font-family='monospace' font-size='9' fill='#7a7368'>SEP 2023</text>
    <rect x='32' y='208' width='168' height='75' fill='none' stroke='#3a342c'/>
    <text x='44' y='234' font-size='13'>Field Notes</text>
    <text x='44' y='252' font-family='monospace' font-size='9' fill='#7a7368'>JAN 2024</text>
    <rect x='216' y='208' width='168' height='75' fill='none' stroke='#cf9a45'/>
    <text x='228' y='234' font-size='13' fill='#cf9a45'>The Lighthouse</text>
    <text x='228' y='252' font-family='monospace' font-size='9' fill='#cf9a45'>FEATURED</text>
    <rect x='400' y='208' width='168' height='75' fill='none' stroke='#3a342c'/>
    <text x='412' y='234' font-size='13'>Riverbend</text>
    <text x='412' y='252' font-family='monospace' font-size='9' fill='#7a7368'>FEB 2022</text>
  </g>
  <line x1='32' y1='312' x2='568' y2='312' stroke='#2a2620'/>
  <text x='32' y='336' font-family='monospace' font-size='10' fill='#7a7368'>SHOWING 1–6 OF 412</text>
  <text x='568' y='336' text-anchor='end' font-family='monospace' font-size='10' fill='#cf9a45'>NEXT →</text>
</svg>
`;

const SVG_TWO_READERS = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='#1a1815'/>
  <rect x='0' y='0' width='600' height='28' fill='#0f0d0a'/>
  <circle cx='16' cy='14' r='5' fill='#c34d3a'/>
  <circle cx='32' cy='14' r='5' fill='#cf9a45'/>
  <circle cx='48' cy='14' r='5' fill='#5e9c66'/>
  <text x='300' y='18' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>admin · /sessions</text>
  <text x='32' y='62' font-family='Playfair Display, serif' font-size='20' fill='#e8e5dd'>Two readers, just now</text>
  <text x='32' y='82' font-family='monospace' font-size='10' fill='#7a7368'>FIRST EXTERNAL LOGINS · UNAIDED</text>
  <line x1='32' y1='102' x2='568' y2='102' stroke='#2a2620'/>
  <g font-family='monospace' font-size='11'>
    <rect x='32' y='124' width='536' height='52' fill='#0f0d0a' stroke='#3a342c'/>
    <text x='48' y='148' fill='#cfc7b3'>j.alvarez@example.com</text>
    <text x='48' y='166' fill='#7a7368'>signed in 2m ago · read "The Lighthouse" · left a comment</text>
    <rect x='32' y='192' width='536' height='52' fill='#0f0d0a' stroke='#3a342c'/>
    <text x='48' y='216' fill='#cfc7b3'>p.okafor@example.com</text>
    <text x='48' y='234' fill='#7a7368'>signed in 11m ago · read "Asylum" · left a comment</text>
  </g>
  <text x='300' y='298' text-anchor='middle' font-family='Playfair Display, serif' font-style='italic' font-size='14' fill='#cf9a45'>"this still works. i can't believe this still works."</text>
  <text x='300' y='320' text-anchor='middle' font-family='monospace' font-size='9' fill='#7a7368'>— j.alvarez, on "The Lighthouse"</text>
</svg>
`;

const SEED_MILESTONES: SeedMilestone[] = [
  {
    hoursBeforeNow: 21.5,
    type: "update",
    title: "Cracked open the corpse",
    description:
      "Cloned the old repo. npm install fails on three deprecated packages. Replaced node-sass, pinned express, swapped out an unmaintained mailer. App boots to a 500 — but it boots.",
    blocker: false,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 20.25,
    type: "blocker",
    title: "Migration crash traced to NULL author rows",
    description:
      "Found 38 poems with NULL author_id from a 2023 import bug. Wrote a one-shot script to backfill from the user_emails table. Migrations now run clean.",
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
    screenshotSvg: SVG_FIRST_PROOF,
  },
  {
    hoursBeforeNow: 15.67,
    type: "breakthrough",
    title: "Auth completely rewritten",
    description:
      "The old session library is unmaintained. Ripped it out, wired up magic-link email auth in 90 minutes. Logged in as myself on a fresh browser. 14 fewer routes than the old flow.",
    blocker: false,
    breakthrough: true,
    screenshotSvg: SVG_AUTH_REWRITE,
  },
  {
    hoursBeforeNow: 12.25,
    type: "blocker",
    title: "Lost an hour to a Postgres collation mismatch",
    description:
      "Production dump used en_US.UTF-8, dev container used C.UTF-8. Indexes were silently broken. Rebuilt with the right collation, tests green again.",
    blocker: true,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 8,
    type: "breakthrough",
    title: "Public reading room ships",
    description:
      "/room lists all 412 recovered poems with search and pagination. Loads in under 300ms. No auth required to read — the archive is open.",
    blocker: false,
    breakthrough: true,
    screenshotSvg: SVG_READING_ROOM,
  },
  {
    hoursBeforeNow: 2.5,
    type: "update",
    title: "Two real readers log in",
    description:
      "Sent the magic link to two friends. Both logged in without help. One left a comment on a poem from 2022: 'this still works. i can't believe this still works.'",
    blocker: false,
    breakthrough: false,
    screenshotSvg: SVG_TWO_READERS,
  },
  {
    hoursBeforeNow: 0.5,
    type: "milestone",
    title: "Filed evidence, locked the case",
    description:
      "Wrote the briefing. Recorded a screen capture for the demo. Project is alive, indexed, and reachable from a real URL.",
    blocker: false,
    breakthrough: false,
  },
];

const EXAMPLE_GENERATED_SUMMARY = `In 24 hours, an abandoned poetry archive went from a project that couldn't boot to a public reading room with 412 recovered poems and two readers logged in. The corpse was a two-year-old Node app with crashing migrations, an unmaintained auth library, and a corrupted database dump. The autopsy turned into a resurrection in three moves: backfill the NULL author rows that broke every migration, rip out the dead session library and replace it with magic-link auth, and ship a public /room view that lets anyone read the archive without an account. Along the way it survived two blockers — a NULL-row migration crash and a Postgres collation mismatch that silently invalidated every index. The proof is concrete: poem #1 renders, /room loads under 300ms, and two outside readers signed in tonight without any hand-holding.`;

const EXAMPLE_GENERATED_DEMO_SCRIPT = `This is DeadWords. Two days ago it had been dead for fourteen months. Migrations crashed on boot. Login returned a five-hundred. Nobody knew if the four hundred poems in the dump still existed.

Watch the URL bar. /poems/1. Two-hundred OK, two-hundred-seventeen milliseconds. That's the first poem since 2023, rendered out of a database we thought was corrupted. That's the moment it came back.

Then I tore out the broken auth and replaced it with one-link email login. Ninety minutes. Logged in clean on a fresh browser.

Then I shipped /room. Four-hundred-twelve recovered poems, public, searchable, three-hundred milliseconds. No account required to read.

Tonight, two readers I didn't tell about this signed in on their own. One left a comment on a poem from 2022 that said: 'this still works. i can't believe this still works.'

That's the proof. Twenty-four hours. From dead to read.`;

interface ProjectSeedFields {
  title: string;
  builder_name: string;
  one_liner: string;
  starting_state: string;
  current_state: string;
  replit_url: string;
  demo_url: string;
  start_time: Date;
  published: boolean;
  generated_summary: string;
  generated_demo_script: string;
}

function buildProjectFields(now: number): ProjectSeedFields {
  return {
    title: "Alive or Dead — The DeadWords Resurrection",
    builder_name: "Mara K.",
    one_liner:
      "A 24-hour rescue of an abandoned poetry archive — from a corpse that wouldn't boot to a public reading room with two real readers logged in.",
    starting_state:
      "A two-year-old side project that hadn't booted in 14 months. Database migrations crashed on start. The login page returned a 500. Nobody knew if any of the 400+ saved poems still existed in the SQL dump.",
    current_state:
      "Reading room is live at /room. 412 poems recovered from the dump and re-indexed. New magic-link login replaced the dead session library. Public archive loads in under 300ms. Two outside readers signed in tonight without help.",
    replit_url: "https://replit.com/@example/deadwords",
    demo_url: "https://deadwords.example.app",
    start_time: new Date(now - 22 * 60 * 60 * 1000),
    published: true,
    generated_summary: EXAMPLE_GENERATED_SUMMARY,
    generated_demo_script: EXAMPLE_GENERATED_DEMO_SCRIPT,
  };
}

/**
 * Idempotent seed of the public example case file. If the project exists, its
 * fields and milestones are replaced in place so the seeded demo always
 * reflects the latest copy and screenshots; the slug and edit_token stay
 * pinned so saved share links keep resolving.
 */
export async function seedExampleProject(): Promise<void> {
  try {
    const now = Date.now();
    const fields = buildProjectFields(now);

    const [existing] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.slug, EXAMPLE_SLUG));

    let projectId: number;
    if (existing) {
      await db
        .update(projectsTable)
        .set(fields)
        .where(eq(projectsTable.id, existing.id));
      await db
        .delete(milestonesTable)
        .where(eq(milestonesTable.project_id, existing.id));
      projectId = existing.id;
    } else {
      const [created] = await db
        .insert(projectsTable)
        .values({
          slug: EXAMPLE_SLUG,
          edit_token: EXAMPLE_EDIT_TOKEN,
          ...fields,
        })
        .returning();
      projectId = created.id;
    }

    for (let i = 0; i < SEED_MILESTONES.length; i++) {
      const m = SEED_MILESTONES[i];
      await db.insert(milestonesTable).values({
        project_id: projectId,
        sort_order: i,
        occurred_at: new Date(now - m.hoursBeforeNow * 60 * 60 * 1000),
        type: m.type,
        title: m.title,
        description: m.description,
        blocker: m.blocker,
        breakthrough: m.breakthrough,
        screenshot_data: m.screenshotSvg ? svgDataUrl(m.screenshotSvg) : null,
      });
    }

    logger.info(
      { projectId, slug: EXAMPLE_SLUG, action: existing ? "updated" : "created" },
      "Seeded example proof-of-life project",
    );
  } catch (err) {
    logger.error({ err }, "Example seed failed");
  }
}
