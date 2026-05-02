import { db, projectsTable, milestonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ---------- shared helpers ----------

interface SeedMilestone {
  hoursBeforeNow: number;
  type: "update" | "blocker" | "breakthrough" | "milestone";
  title: string;
  description: string;
  blocker: boolean;
  breakthrough: boolean;
  screenshotSvg?: string;
}

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

interface SeedSpec {
  slug: string;
  editToken: string;
  startHoursBeforeNow: number;
  fields: (now: number) => ProjectSeedFields;
  milestones: SeedMilestone[];
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg.trim(), "utf8").toString("base64")}`;
}

// ---------- example #1: DeadWords (fictional polished walk-through) ----------

const DEADWORDS_SLUG = "alive-or-dead-the-deadwords-resurrection";
const DEADWORDS_EDIT_TOKEN =
  "example_demo_token_do_not_use_in_real_projects_xyz";

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

const DEADWORDS_MILESTONES: SeedMilestone[] = [
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
];

const DEADWORDS_GENERATED_SUMMARY = `In 24 hours, an abandoned poetry archive went from a project that couldn't boot to a public reading room with 412 recovered poems and two readers logged in. The corpse was a two-year-old Node app with crashing migrations, an unmaintained auth library, and a corrupted database dump. The autopsy turned into a resurrection in three moves: backfill the NULL author rows that broke every migration, rip out the dead session library and replace it with magic-link auth, and ship a public /room view that lets anyone read the archive without an account. The hardest blocker was a migration crash traced back to 38 NULL author rows from a 2023 import bug — once that was patched, every downstream fix came faster. The proof is concrete: poem #1 renders, /room loads under 300ms, and two outside readers signed in tonight without any hand-holding.`;

const DEADWORDS_GENERATED_DEMO_SCRIPT = `This is DeadWords. Two days ago it had been dead for fourteen months. Migrations crashed on boot. Login returned a five-hundred. Nobody knew if the four hundred poems in the dump still existed.

Watch the URL bar. /poems/1. Two-hundred OK, two-hundred-seventeen milliseconds. That's the first poem since 2023, rendered out of a database we thought was corrupted. That's the moment it came back.

Then I tore out the broken auth and replaced it with one-link email login. Ninety minutes. Logged in clean on a fresh browser.

Then I shipped /room. Four-hundred-twelve recovered poems, public, searchable, three-hundred milliseconds. No account required to read.

Tonight, two readers I didn't tell about this signed in on their own. One left a comment on a poem from 2022 that said: 'this still works. i can't believe this still works.'

That's the proof. Twenty-four hours. From dead to read.`;

const DEADWORDS_SPEC: SeedSpec = {
  slug: DEADWORDS_SLUG,
  editToken: DEADWORDS_EDIT_TOKEN,
  startHoursBeforeNow: 22,
  fields: (now) => ({
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
    generated_summary: DEADWORDS_GENERATED_SUMMARY,
    generated_demo_script: DEADWORDS_GENERATED_DEMO_SCRIPT,
  }),
  milestones: DEADWORDS_MILESTONES,
};

// ---------- example #2: Proof of Life builds itself (the meta case) ----------

export const META_CASE_SLUG = "proof-of-life-builds-itself";
const META_CASE_EDIT_TOKEN =
  "meta_example_demo_token_do_not_use_in_real_projects";

const SVG_NEW_FORM = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='#1a1815'/>
  <rect x='0' y='0' width='600' height='28' fill='#0f0d0a'/>
  <circle cx='16' cy='14' r='5' fill='#c34d3a'/>
  <circle cx='32' cy='14' r='5' fill='#cf9a45'/>
  <circle cx='48' cy='14' r='5' fill='#5e9c66'/>
  <text x='300' y='18' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>proof-of-life.replit.app/new</text>
  <text x='32' y='58' font-family='monospace' font-size='9' fill='#cf9a45'>FILE NEW CASE</text>
  <text x='32' y='82' font-family='Playfair Display, serif' font-size='22' fill='#e8e5dd'>Open a case file</text>
  <text x='32' y='102' font-family='monospace' font-size='10' fill='#7a7368'>NO ACCOUNT · NO SETUP · KEEP THE EDIT LINK</text>
  <line x1='32' y1='118' x2='568' y2='118' stroke='#2a2620'/>
  <text x='32' y='142' font-family='monospace' font-size='9' fill='#7a7368'>PROJECT TITLE</text>
  <rect x='32' y='150' width='536' height='34' fill='#0f0d0a' stroke='#3a342c'/>
  <text x='44' y='172' font-family='Playfair Display, serif' font-size='14' fill='#e8e5dd'>Proof of Life</text>
  <text x='32' y='208' font-family='monospace' font-size='9' fill='#7a7368'>BUILDER</text>
  <rect x='32' y='216' width='260' height='30' fill='#0f0d0a' stroke='#3a342c'/>
  <text x='44' y='236' font-family='monospace' font-size='12' fill='#cfc7b3'>built on Replit</text>
  <text x='308' y='208' font-family='monospace' font-size='9' fill='#7a7368'>ONE-LINER</text>
  <rect x='308' y='216' width='260' height='30' fill='#0f0d0a' stroke='#3a342c'/>
  <text x='320' y='236' font-family='Playfair Display, serif' font-style='italic' font-size='12' fill='#cfc7b3'>prove the thing is alive</text>
  <text x='32' y='270' font-family='monospace' font-size='9' fill='#7a7368'>STARTING STATE</text>
  <rect x='32' y='278' width='536' height='52' fill='#0f0d0a' stroke='#3a342c'/>
  <text x='44' y='298' font-family='Playfair Display, serif' font-size='12' fill='#b3aa97'>Empty Replit project. One sentence in a notes app.</text>
  <text x='44' y='316' font-family='Playfair Display, serif' font-size='12' fill='#b3aa97'>No schema. No screens. No example.</text>
  <rect x='420' y='344' width='148' height='30' fill='#cf9a45'/>
  <text x='494' y='364' text-anchor='middle' font-family='monospace' font-size='11' fill='#1a1815' font-weight='bold'>FILE THIS CASE</text>
</svg>
`;

const SVG_DOSSIER_CARD = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='#1a1815'/>
  <rect x='0' y='0' width='600' height='28' fill='#0f0d0a'/>
  <circle cx='16' cy='14' r='5' fill='#c34d3a'/>
  <circle cx='32' cy='14' r='5' fill='#cf9a45'/>
  <circle cx='48' cy='14' r='5' fill='#5e9c66'/>
  <text x='300' y='18' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>proof-of-life.replit.app/p/proof-of-life-builds-itself</text>
  <text x='32' y='58' font-family='monospace' font-size='9' fill='#7a7368'>CASE FILE #0002</text>
  <rect x='460' y='46' width='108' height='20' fill='none' stroke='#5e9c66'/>
  <circle cx='474' cy='56' r='3' fill='#5e9c66'/>
  <text x='486' y='60' font-family='monospace' font-size='9' fill='#5e9c66'>STATUS: ALIVE</text>
  <text x='32' y='102' font-family='Playfair Display, serif' font-size='24' fill='#e8e5dd'>Proof of Life — built itself</text>
  <text x='32' y='126' font-family='Playfair Display, serif' font-style='italic' font-size='13' fill='#b3aa97'>From a one-line idea to a working dossier the same week.</text>
  <line x1='32' y1='148' x2='568' y2='148' stroke='#2a2620'/>
  <g font-family='monospace' font-size='9' fill='#7a7368'>
    <rect x='32' y='162' width='168' height='52' fill='none' stroke='#3a342c'/>
    <text x='44' y='180'>EXHIBITS</text>
    <text x='44' y='204' font-family='Playfair Display, serif' font-size='18' fill='#e8e5dd'>06</text>
    <rect x='216' y='162' width='168' height='52' fill='none' stroke='#3a342c'/>
    <text x='228' y='180'>BREAKTHROUGHS</text>
    <text x='228' y='204' font-family='Playfair Display, serif' font-size='18' fill='#cf9a45'>03</text>
    <rect x='400' y='162' width='168' height='52' fill='none' stroke='#3a342c'/>
    <text x='412' y='180'>BLOCKERS</text>
    <text x='412' y='204' font-family='Playfair Display, serif' font-size='18' fill='#e8e5dd'>01</text>
  </g>
  <text x='32' y='250' font-family='monospace' font-size='9' fill='#7a7368'>EVIDENCE TIMELINE</text>
  <line x1='32' y1='258' x2='568' y2='258' stroke='#2a2620'/>
  <g>
    <text x='32' y='280' font-family='monospace' font-size='10' fill='#7a7368'>02</text>
    <text x='60' y='280' font-family='Playfair Display, serif' font-size='13' fill='#e8e5dd'>First case file persists to the database</text>
    <rect x='452' y='268' width='116' height='16' fill='none' stroke='#cf9a45'/>
    <text x='510' y='280' text-anchor='middle' font-family='monospace' font-size='9' fill='#cf9a45'>BREAKTHROUGH</text>
  </g>
  <g>
    <text x='32' y='306' font-family='monospace' font-size='10' fill='#7a7368'>03</text>
    <text x='60' y='306' font-family='Playfair Display, serif' font-size='13' fill='#e8e5dd'>Milestone sort_order forgot to be unique</text>
    <rect x='452' y='294' width='116' height='16' fill='none' stroke='#c34d3a'/>
    <text x='510' y='306' text-anchor='middle' font-family='monospace' font-size='9' fill='#c34d3a'>BLOCKER</text>
  </g>
  <g>
    <text x='32' y='332' font-family='monospace' font-size='10' fill='#7a7368'>04</text>
    <text x='60' y='332' font-family='Playfair Display, serif' font-size='13' fill='#e8e5dd'>Dark evidence-room aesthetic ships</text>
    <rect x='452' y='320' width='116' height='16' fill='none' stroke='#cf9a45'/>
    <text x='510' y='332' text-anchor='middle' font-family='monospace' font-size='9' fill='#cf9a45'>BREAKTHROUGH</text>
  </g>
</svg>
`;

const SVG_CINEMATIC_HERO = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='#1a1815'/>
  <rect x='0' y='0' width='600' height='28' fill='#0f0d0a'/>
  <circle cx='16' cy='14' r='5' fill='#c34d3a'/>
  <circle cx='32' cy='14' r='5' fill='#cf9a45'/>
  <circle cx='48' cy='14' r='5' fill='#5e9c66'/>
  <text x='300' y='18' text-anchor='middle' font-family='monospace' font-size='10' fill='#7a7368'>proof-of-life.replit.app</text>
  <rect x='28' y='52' width='240' height='14' fill='#cf9a45'/>
  <text x='148' y='63' text-anchor='middle' font-family='monospace' font-size='8' fill='#1a1815' font-weight='bold'>DIRECTIVE 001 · DOCUMENT THE RESURRECTION</text>
  <text x='32' y='112' font-family='Playfair Display, serif' font-size='26' font-weight='bold' fill='#e8e5dd'>Your idea was </text>
  <text x='194' y='112' font-family='Playfair Display, serif' font-size='26' font-weight='bold' fill='#7a7368' text-decoration='line-through'>dead</text>
  <line x1='194' y1='105' x2='248' y2='105' stroke='#c34d3a' stroke-width='2'/>
  <text x='250' y='112' font-family='Playfair Display, serif' font-size='26' font-weight='bold' fill='#e8e5dd'> this morning.</text>
  <text x='32' y='148' font-family='Playfair Display, serif' font-size='26' font-style='italic' font-weight='bold' fill='#cf9a45'>Prove it's alive now.</text>
  <text x='32' y='184' font-family='Playfair Display, serif' font-size='13' fill='#b3aa97'>Turn a 24-hour sprint into a judge-ready proof page.</text>
  <rect x='32' y='208' width='148' height='34' fill='#cf9a45'/>
  <text x='106' y='230' text-anchor='middle' font-family='monospace' font-size='10' fill='#1a1815' font-weight='bold'>CREATE PROOF PAGE</text>
  <rect x='192' y='208' width='120' height='34' fill='none' stroke='#3a342c'/>
  <text x='252' y='230' text-anchor='middle' font-family='monospace' font-size='10' fill='#cfc7b3'>VIEW EXAMPLE</text>
  <rect x='340' y='52' width='228' height='280' fill='#22201c' stroke='#3a342c' stroke-width='2'/>
  <text x='356' y='76' font-family='monospace' font-size='8' fill='#7a7368'>FILE #0002</text>
  <rect x='480' y='66' width='80' height='16' fill='none' stroke='#5e9c66'/>
  <circle cx='492' cy='74' r='2.5' fill='#5e9c66'/>
  <text x='502' y='78' font-family='monospace' font-size='8' fill='#5e9c66'>ALIVE</text>
  <text x='356' y='106' font-family='Playfair Display, serif' font-size='14' fill='#e8e5dd'>Proof of Life — built</text>
  <text x='356' y='124' font-family='Playfair Display, serif' font-size='14' fill='#e8e5dd'>itself</text>
  <text x='356' y='144' font-family='Playfair Display, serif' font-style='italic' font-size='10' fill='#b3aa97'>From idea to working dossier.</text>
  <g font-family='monospace' font-size='7' fill='#7a7368'>
    <rect x='356' y='158' width='66' height='32' fill='none' stroke='#3a342c'/>
    <text x='362' y='170'>EXHIBITS</text>
    <text x='362' y='186' font-family='Playfair Display, serif' font-size='12' fill='#e8e5dd'>06</text>
    <rect x='428' y='158' width='66' height='32' fill='none' stroke='#3a342c'/>
    <text x='434' y='170'>BREAKTHRU</text>
    <text x='434' y='186' font-family='Playfair Display, serif' font-size='12' fill='#cf9a45'>03</text>
    <rect x='500' y='158' width='52' height='32' fill='none' stroke='#3a342c'/>
    <text x='506' y='170'>BLOCKERS</text>
    <text x='506' y='186' font-family='Playfair Display, serif' font-size='12' fill='#e8e5dd'>01</text>
  </g>
  <line x1='356' y1='208' x2='552' y2='208' stroke='#2a2620'/>
  <text x='356' y='224' font-family='monospace' font-size='8' fill='#7a7368'>EVIDENCE TIMELINE</text>
  <text x='356' y='244' font-family='Playfair Display, serif' font-size='10' fill='#e8e5dd'>· First case file persists</text>
  <text x='356' y='260' font-family='Playfair Display, serif' font-size='10' fill='#e8e5dd'>· Sort_order blocker fixed</text>
  <text x='356' y='276' font-family='Playfair Display, serif' font-size='10' fill='#e8e5dd'>· Dark cabinet ships</text>
  <line x1='356' y1='296' x2='552' y2='296' stroke='#2a2620'/>
  <text x='552' y='316' text-anchor='end' font-family='monospace' font-size='8' fill='#cf9a45'>OPEN FULL DOSSIER →</text>
</svg>
`;

const META_CASE_MILESTONES: SeedMilestone[] = [
  {
    hoursBeforeNow: 70,
    type: "update",
    title: "Brief written: 'prove the thing is alive'",
    description:
      "One paragraph in a notes app. Buildathon judges scan twenty demos in an hour and shouldn't have to dig through Notion to see what actually shipped. Build them a single page with the timeline, screenshots, and before/after — fast.",
    blocker: false,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 60,
    type: "breakthrough",
    title: "First case file persists to the database",
    description:
      "Express 5 + Drizzle + PostgreSQL on the back, React 19 + Vite + Tailwind v4 on the front. The /new form takes a title, a builder name, a one-liner, and a starting state, returns a slug + edit_token, and the project survives a full server restart. The skeleton walks.",
    blocker: false,
    breakthrough: true,
    screenshotSvg: SVG_NEW_FORM,
  },
  {
    hoursBeforeNow: 52,
    type: "blocker",
    title: "Milestone sort_order forgot to be unique-per-project",
    description:
      "Two milestones added in the same second got the same sort_order and the timeline reshuffled on refresh. Switched the ordering to (project_id, sort_order, occurred_at) on read and the order locks in. Lesson: never trust a millisecond timestamp as a tiebreaker.",
    blocker: true,
    breakthrough: false,
  },
  {
    hoursBeforeNow: 30,
    type: "breakthrough",
    title: "Dark evidence-room aesthetic ships",
    description:
      "Replaced the bright default palette with a redacted-cabinet look: amber accents, serif headlines, mono labels, alive-pill, redaction-bar headers, milestone tags for BREAKTHROUGH / BLOCKER / EVIDENCE, before/after panels, and a stat row. The page now reads like a case file instead of a Trello board.",
    blocker: false,
    breakthrough: true,
    screenshotSvg: SVG_DOSSIER_CARD,
  },
  {
    hoursBeforeNow: 12,
    type: "breakthrough",
    title: "AI does the writing",
    description:
      "Two endpoints — /generate-summary and /generate-demo-script — call Claude with the project's milestones and produce a 90-second narrative + a spoken demo script. Builders click one button each, judges get a story instead of bullet points. The summary you're reading came from this exact flow.",
    blocker: false,
    breakthrough: true,
  },
  {
    hoursBeforeNow: 0.5,
    type: "update",
    title: "The hero previews its own dossier",
    description:
      "Landing page rebuilt as a two-column cinematic hero — 'Your idea was dead this morning. Prove it's alive now.' On the right, a live preview of one seeded example. Starting tonight, the featured example is this very project. The product is now its own proof of life.",
    blocker: false,
    breakthrough: false,
    screenshotSvg: SVG_CINEMATIC_HERO,
  },
];

const META_CASE_GENERATED_SUMMARY = `Proof of Life started as a single sentence in a notes app and shipped as a working full-stack dossier the same week. The premise: buildathon judges scanning twenty demos in an hour shouldn't have to dig through a Notion doc to see what actually runs. The build moved in three sweeps. First, a working spine — Express + Postgres + React + Vite, with a /new form that persists a project and an edit_token that gates everything else, no accounts required. Then the look: a dark evidence-room aesthetic with amber accents, redacted-bar headers, an alive pill, and milestone tags so a single glance distinguishes breakthrough from blocker from evidence. Finally, the writer: two AI endpoints generate a 90-second narrative and a spoken demo script from the milestone log, so builders log evidence as they go and the story writes itself. The hardest moment was a quiet one — a duplicate sort_order on the milestones table that scrambled timelines on refresh. Once the read path pinned (project_id, sort_order, occurred_at), the rest of the polish landed in one push: cinematic two-column landing, wide proof-page layout, and the meta-loop you're inside of right now — the seeded example on the home page is this app's own case file.`;

const META_CASE_GENERATED_DEMO_SCRIPT = `This is Proof of Life. Three days ago it was a sentence in a notes app: "judges scanning twenty demos in an hour shouldn't have to dig through Notion to see what shipped."

Now it's the page you're looking at. Watch the URL: /p/proof-of-life-builds-itself. That's a real dossier in a real Postgres database, served by a real Express API, rendered by a real Vite frontend. Not a slide. Not a mockup.

Scroll, and you see what every other team will see when they file their own case. A timeline of milestones tagged breakthrough, blocker, or evidence. A before-and-after that contrasts an empty repo with a live app. Screenshots of the actual screens at the moment they first worked. And an AI-generated summary — like this one — written from the milestone log.

The cleanest moment was the migration crash. Two milestones added in the same second got the same sort_order and the timeline reshuffled on refresh. Pinning the composite ordering fixed the bug and unlocked the polish push.

The dossier you're reading was built by the tool you're about to use. Proof of life confirmed.`;

const META_CASE_SPEC: SeedSpec = {
  slug: META_CASE_SLUG,
  editToken: META_CASE_EDIT_TOKEN,
  startHoursBeforeNow: 72,
  fields: (now) => ({
    title: "Proof of Life — the dossier you're reading built itself",
    builder_name: "Built on Replit",
    one_liner:
      "From a one-line buildathon idea to a working dossier app — and the case file you're reading is its own first exhibit.",
    starting_state:
      "An empty Replit project and a single sentence in a notes app: 'a tool for buildathon participants to prove their idea is alive.' No schema. No screens. No example. Just the instinct that judges scanning twenty demos in an hour need a faster way to see what actually shipped.",
    current_state:
      "A live full-stack app: Express 5 + PostgreSQL + Drizzle on the back, React 19 + Vite + Tailwind v4 + shadcn on the front. AI-generated summaries and demo scripts. A dark evidence-room aesthetic with milestone tags, before/after panels, and shareable cards. A cinematic landing whose featured example is this very dossier — the product is now its own proof of life.",
    replit_url: "https://replit.com/@replit/proof-of-life",
    demo_url: "https://proof-of-life.replit.app",
    start_time: new Date(now - 72 * 60 * 60 * 1000),
    published: true,
    generated_summary: META_CASE_GENERATED_SUMMARY,
    generated_demo_script: META_CASE_GENERATED_DEMO_SCRIPT,
  }),
  milestones: META_CASE_MILESTONES,
};

// ---------- idempotent seed ----------

async function seedOne(spec: SeedSpec, now: number): Promise<void> {
  const fields = spec.fields(now);

  const [existing] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.slug, spec.slug));

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
        slug: spec.slug,
        edit_token: spec.editToken,
        ...fields,
      })
      .returning();
    projectId = created.id;
  }

  for (let i = 0; i < spec.milestones.length; i++) {
    const m = spec.milestones[i];
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
    { projectId, slug: spec.slug, action: existing ? "updated" : "created" },
    "Seeded proof-of-life example project",
  );
}

/**
 * Idempotent seed of the public example case files. Both projects are
 * upserted by slug so saved share links keep resolving across restarts;
 * milestones for each project are fully replaced so the seeded demos
 * always reflect the latest copy and screenshots.
 *
 * Two projects are seeded:
 *  - The meta case (META_CASE_SLUG): the featured example shown on the
 *    landing page hero. Documents the building of Proof of Life itself.
 *  - DeadWords (DEADWORDS_SLUG): a polished fictional walk-through kept
 *    as a secondary reference example.
 */
export async function seedExampleProject(): Promise<void> {
  try {
    const now = Date.now();
    await seedOne(META_CASE_SPEC, now);
    await seedOne(DEADWORDS_SPEC, now);
  } catch (err) {
    logger.error({ err }, "Example seed failed");
  }
}
