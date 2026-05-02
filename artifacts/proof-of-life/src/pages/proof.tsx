import { useRoute, Link } from "wouter";
import { Layout, DossierSkeleton } from "@/components/layout";
import { useProjectBySlug } from "@/hooks/use-api";
import {
  CaseEmpty,
  CopyLinkButton,
  ScreenshotLightbox,
  StatTile,
  formatDuration,
  pad2,
} from "@/components/dossier";
import {
  localStorageKeyForProject,
  shareLinkForSlug,
  SEEDED_EXAMPLE_PATH,
  SEEDED_EXAMPLE_SLUG,
  type Project,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

/**
 * Builds the plain-text submission summary that gets copied when a builder
 * hits "Copy submission summary" — a paste-ready block they can drop into
 * a buildathon submission form, Discord post, or judging rubric.
 *
 * Always available: even if the AI briefing is empty, this falls back to
 * a structured before/after + counts block so judges still get a useful
 * paste.
 */
function buildSubmissionSummary(project: Project, publicUrl: string): string {
  const milestones = project.milestones ?? [];
  const exhibits = milestones.length;
  const breakthroughs = milestones.filter((m) => m.breakthrough).length;
  const blockers = milestones.filter((m) => m.blocker).length;
  const lines: (string | null)[] = [
    project.title,
    project.builder_name ? `Filed by ${project.builder_name}` : null,
    project.one_liner || null,
    "",
    `Public dossier: ${publicUrl}`,
  ];
  if (project.replit_url) lines.push(`Source: ${project.replit_url}`);
  if (project.demo_url) lines.push(`Live demo: ${project.demo_url}`);
  lines.push(
    "",
    "BEFORE",
    project.starting_state || "—",
    "",
    "AFTER",
    project.current_state || "—",
    "",
    `EVIDENCE: ${exhibits} exhibits · ${breakthroughs} breakthroughs · ${blockers} blockers survived`,
    "VERDICT: Alive",
  );
  if (project.generated_summary) {
    lines.push("", "BRIEFING", project.generated_summary);
  }
  return lines.filter((l): l is string => l !== null).join("\n");
}

export default function ProofPage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug;
  const { data: project, isLoading, isError } = useProjectBySlug(slug!);

  if (isLoading)
    return (
      <Layout size="wide">
        <DossierSkeleton />
      </Layout>
    );

  if (isError || !project) {
    return (
      <Layout size="wide">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="font-mono text-xs sm:text-sm tracking-widest text-destructive uppercase border border-destructive/30 px-3 py-1">
            Error 404
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-foreground">
            Case File Sealed
          </h1>
          <p className="text-muted-foreground font-mono text-xs sm:text-sm max-w-md">
            The requested evidence could not be located. It may have been
            redacted, destroyed, or never filed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
            <Link href="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full font-mono uppercase text-xs border-border"
              >
                Return to front desk
              </Button>
            </Link>
            <Link href={SEEDED_EXAMPLE_PATH} className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full font-mono uppercase text-xs border-primary/40 text-primary hover:bg-primary/10"
              >
                See seeded example →
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (typeof document !== "undefined") {
    document.title = `${project.title} — Proof of Life`;
  }

  const sortedMilestones = [...(project.milestones || [])].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
  });

  const firstBreakthrough = sortedMilestones.find((m) => m.breakthrough);
  const blockers = sortedMilestones.filter((m) => m.blocker);
  const screenshotMilestones = sortedMilestones.filter(
    (m) => !!m.screenshot_data,
  );

  const startMs = project.start_time
    ? new Date(project.start_time).getTime()
    : null;
  const timeToPrototypeMs =
    startMs && firstBreakthrough
      ? new Date(firstBreakthrough.occurred_at).getTime() - startMs
      : null;

  // Owner hint only — the edit token in localStorage is never used to gate
  // data, just to surface a "Generate in editor →" CTA on empty sections.
  const isOwner =
    typeof window !== "undefined" &&
    !!localStorage.getItem(localStorageKeyForProject(project.id));
  const editorHref = `/edit/${project.id}`;

  const publicUrl =
    typeof window !== "undefined"
      ? window.location.href
      : shareLinkForSlug(project.slug);

  const blockerLabel =
    blockers.length === 0
      ? "Clean run"
      : `${pad2(blockers.length)} survived`;

  return (
    <Layout size="wide">
      <div className="space-y-16 md:space-y-20 pb-16">
        {/* Case-file masthead */}
        <header className="space-y-6 border-b border-border pb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <div className="font-mono text-[10px] sm:text-xs tracking-widest text-muted-foreground uppercase">
                File ID #{String(project.id).padStart(4, "0")} · Filed by{" "}
                <span className="text-foreground">{project.builder_name}</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-foreground leading-[1.05] break-words">
                {project.title}
              </h1>
              <div className="text-base sm:text-lg md:text-xl font-serif text-muted-foreground italic max-w-2xl">
                {project.one_liner}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <CopyLinkButton value={publicUrl} label="Copy link" />
              <CopyLinkButton
                value={buildSubmissionSummary(project, publicUrl)}
                label="Copy submission summary"
              />
              {project.demo_url && (
                <a
                  href={project.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono uppercase text-xs tracking-wider border-primary/40 text-primary hover:bg-primary/10"
                  >
                    Open App →
                  </Button>
                </a>
              )}
              {project.replit_url && (
                <a
                  href={project.replit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono uppercase text-xs tracking-wider"
                  >
                    View Source →
                  </Button>
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
            <StatTile
              label="Proof status"
              value={
                <span className="alive-pill !px-2 !py-1 !text-xs">
                  <span className="alive-dot"></span>
                  Alive
                </span>
              }
              hint="Heartbeat detected"
            />
            <StatTile
              label="Time to prototype"
              value={formatDuration(timeToPrototypeMs)}
              hint={firstBreakthrough ? "First breakthrough" : "Pending"}
            />
            <StatTile
              label="Evidence"
              value={`${pad2(sortedMilestones.length)} exhibits`}
              hint="In the log"
            />
            <StatTile
              label="Key breakthrough"
              value={firstBreakthrough ? firstBreakthrough.title : "—"}
              hint={firstBreakthrough ? "First breakthrough" : "Pending"}
              className="col-span-2 sm:col-span-1"
            />
            <StatTile
              label="Blocker survived"
              value={blockerLabel}
              hint={blockers.length === 0 ? "No incidents" : "Survived"}
            />
          </div>

          {blockers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                Survived:
              </span>
              {blockers.map((b, i) => (
                <span
                  key={b.id}
                  className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-destructive/30 bg-destructive/10 text-destructive max-w-[18rem] truncate"
                  title={b.title}
                >
                  #{pad2(i + 1)} · {b.title}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Case Conclusion — above-the-fold delta summary so judges can
            grasp the before/after, evidence counts, and verdict without
            scrolling. */}
        <section className="border border-primary/30 bg-primary/5 p-5 md:p-7 space-y-4 relative overflow-hidden">
          <div
            className="absolute -top-12 -right-8 w-48 h-48 bg-primary/10 blur-3xl rounded-full pointer-events-none"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-mono text-[10px] sm:text-xs tracking-widest text-primary uppercase">
              Case Conclusion
            </h2>
            <span className="alive-pill">
              <span className="alive-dot"></span>
              Verdict: Alive
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1 min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-widest text-destructive/80">
                Started with
              </div>
              <p className="font-serif text-sm md:text-base text-muted-foreground leading-snug line-clamp-3">
                {project.starting_state || "—"}
              </p>
            </div>
            <div className="space-y-1 min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-widest text-primary">
                Ended with
              </div>
              <p className="font-serif text-sm md:text-base text-foreground leading-snug line-clamp-3">
                {project.current_state || "—"}
              </p>
            </div>
          </div>
          <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">
            Evidence:{" "}
            <span className="text-foreground">
              {pad2(sortedMilestones.length)} exhibits
            </span>
            {" · "}
            <span className="text-primary">
              {pad2(sortedMilestones.filter((m) => m.breakthrough).length)}{" "}
              breakthroughs
            </span>
            {" · "}
            <span className="text-foreground">
              {blockers.length === 0
                ? "Clean run"
                : `${pad2(blockers.length)} blockers survived`}
            </span>
          </div>
          {project.slug === SEEDED_EXAMPLE_SLUG && (
            <p className="font-serif text-xs sm:text-sm italic text-muted-foreground/90 border-t border-primary/20 pt-3">
              This live dossier was generated by Proof of Life to document
              the creation of Proof of Life itself.
            </p>
          )}
        </section>

        {/* Before → After */}
        <section className="space-y-6">
          <h2 className="redaction-bar text-xs">Before → After</h2>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-stretch">
            <div className="border border-border bg-card/40 p-5 md:p-6 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Before
              </div>
              <p className="font-serif text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {project.starting_state || "No prior state recorded."}
              </p>
            </div>
            <div
              className="hidden md:flex items-center justify-center text-primary/70 font-serif text-3xl"
              aria-hidden="true"
            >
              →
            </div>
            <div className="md:hidden text-center text-primary/70 font-serif text-2xl py-1" aria-hidden="true">
              ↓
            </div>
            <div className="border border-primary/30 bg-primary/5 p-5 md:p-6 space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
                After
              </div>
              <p className="font-serif text-base md:text-lg leading-relaxed text-foreground whitespace-pre-wrap">
                {project.current_state || "Monitoring ongoing..."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground uppercase tracking-widest pt-2">
            <span>
              Alive since:{" "}
              <span className="text-foreground">
                {project.start_time
                  ? new Date(project.start_time).toLocaleString()
                  : "Unknown"}
              </span>
            </span>
            {project.replit_url && (
              <a
                href={project.replit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                → Source
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                → Live subject
              </a>
            )}
          </div>
        </section>

        {/* Moment of Animation (hero breakthrough) */}
        {firstBreakthrough && (
          <section className="space-y-5 bg-primary/5 border border-primary/20 p-6 md:p-12 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"
              aria-hidden="true"
            ></div>
            <h2 className="font-mono text-[10px] sm:text-xs tracking-widest text-primary uppercase">
              Moment of Animation
            </h2>
            <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-foreground font-bold break-words">
              {firstBreakthrough.title}
            </h3>
            {firstBreakthrough.description && (
              <p className="font-sans text-muted-foreground max-w-2xl text-base md:text-lg">
                {firstBreakthrough.description}
              </p>
            )}
            {firstBreakthrough.screenshot_data && (
              <div className="mt-6 border border-primary/30 p-2 bg-background">
                <img
                  src={firstBreakthrough.screenshot_data}
                  alt="Breakthrough Exhibit"
                  className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700"
                />
                <div className="font-mono text-[10px] text-primary/70 uppercase mt-2 text-right tracking-widest">
                  Primary Artifact
                </div>
              </div>
            )}
          </section>
        )}

        {/* Evidence Timeline */}
        <section className="space-y-6">
          <h2 className="redaction-bar text-xs">Evidence Timeline</h2>
          {sortedMilestones.length === 0 ? (
            <CaseEmpty
              label="Empty Log"
              message="No evidence has been filed for this case yet. The investigation is just beginning."
            />
          ) : (
            <div className="relative pl-5 md:pl-8 border-l border-border space-y-10 md:space-y-12 py-4">
              {sortedMilestones.map((m, i) => {
                const dotClass = m.breakthrough
                  ? "timeline-dot-breakthrough"
                  : m.blocker
                  ? "timeline-dot-blocker"
                  : "timeline-dot-update";
                const tSinceStart = startMs
                  ? formatDuration(
                      new Date(m.occurred_at).getTime() - startMs,
                    )
                  : null;
                return (
                  <div
                    key={m.id}
                    className="relative stagger-fade-in"
                    style={{ animationDelay: `${Math.min(i * 0.08, 0.8)}s` }}
                  >
                    <div
                      className={`absolute -left-[26px] md:-left-[40px] top-2 w-3 md:w-4 h-3 md:h-4 rounded-full ${dotClass}`}
                      aria-hidden="true"
                    ></div>

                    <div className="space-y-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${
                            m.breakthrough
                              ? "bg-primary/10 text-primary border-primary/30"
                              : m.blocker
                              ? "bg-destructive/10 text-destructive border-destructive/30"
                              : "bg-secondary/50 text-secondary-foreground border-border"
                          }`}
                        >
                          {m.breakthrough
                            ? "Breakthrough"
                            : m.blocker
                            ? "Blocker survived"
                            : "Update"}
                        </span>
                        <time className="font-mono text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(m.occurred_at).toLocaleString()}
                        </time>
                        {tSinceStart && (
                          <span className="font-mono text-[10px] sm:text-xs text-muted-foreground/70">
                            · T+{tSinceStart}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl font-bold break-words">
                        {m.title}
                      </h3>

                      {m.description && (
                        <p className="font-sans text-sm sm:text-base text-muted-foreground max-w-2xl">
                          {m.description}
                        </p>
                      )}

                      {m.screenshot_data && (
                        <ScreenshotLightbox
                          src={m.screenshot_data}
                          caption={m.title}
                          description={m.description ?? undefined}
                          timestamp={new Date(m.occurred_at).toLocaleString()}
                          exhibit={`Exhibit ${pad2(i + 1)}`}
                          trigger={
                            <button
                              type="button"
                              className="block mt-2 border border-border p-1 bg-card max-w-2xl w-full text-left transition-colors hover:border-primary/50 cursor-zoom-in"
                              aria-label={`Enlarge exhibit ${pad2(i + 1)}: ${m.title}`}
                            >
                              <img
                                src={m.screenshot_data}
                                alt={`Exhibit ${i + 1}: ${m.title}`}
                                className="w-full h-auto"
                              />
                              <div className="font-mono text-[10px] text-muted-foreground uppercase mt-1 text-right tracking-widest">
                                Exhibit {pad2(i + 1)} · click to enlarge
                              </div>
                            </button>
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h2 className="redaction-bar text-xs">Screenshot Gallery</h2>
          {screenshotMilestones.length === 0 ? (
            <CaseEmpty
              label="No exhibits photographed"
              message="No screenshots have been attached to any milestone. Visual exhibits make a case file land harder for judges scanning quickly."
              cta={
                isOwner ? (
                  <Link href={editorHref}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono uppercase text-xs border-primary/40 text-primary hover:bg-primary/10"
                    >
                      Attach screenshots in editor →
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : screenshotMilestones.length === 1 ? (
            <CaseEmpty
              label="Single exhibit on file"
              message="Only one screenshot has been attached so far — see the Moment of Animation above. Two or more screenshots will unlock the full gallery view."
              cta={
                isOwner ? (
                  <Link href={editorHref}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono uppercase text-xs border-primary/40 text-primary hover:bg-primary/10"
                    >
                      Add another exhibit →
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {screenshotMilestones.map((m) => {
                const idx = sortedMilestones.findIndex((x) => x.id === m.id);
                const exhibit = `Exhibit ${pad2(idx + 1)}`;
                return (
                  <ScreenshotLightbox
                    key={m.id}
                    src={m.screenshot_data!}
                    caption={m.title}
                    description={m.description ?? undefined}
                    timestamp={new Date(m.occurred_at).toLocaleString()}
                    exhibit={exhibit}
                    trigger={
                      <button
                        type="button"
                        className="group block w-full text-left border border-border bg-card hover:border-primary/50 transition-colors cursor-zoom-in"
                        aria-label={`Enlarge ${exhibit}: ${m.title}`}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-background border-b border-border">
                          <img
                            src={m.screenshot_data!}
                            alt={`${exhibit}: ${m.title}`}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                        </div>
                        <div className="p-2 space-y-1">
                          <div className="font-mono text-[9px] uppercase tracking-widest text-primary">
                            {exhibit}
                          </div>
                          <div className="font-serif text-xs sm:text-sm leading-tight text-foreground line-clamp-2">
                            {m.title}
                          </div>
                        </div>
                      </button>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Judge Briefing & Demo Script */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 border-t border-border pt-12">
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="redaction-bar text-xs">Judge Briefing</h2>
              {project.generated_summary && (
                <CopyLinkButton
                  value={project.generated_summary}
                  label="Copy briefing"
                />
              )}
            </div>
            {project.generated_summary ? (
              <BriefingCard text={project.generated_summary} />
            ) : (
              <CaseEmpty
                label="Briefing Pending"
                message="No briefing has been compiled yet. The case file owner can generate one in seconds from their authoring console."
                cta={
                  isOwner ? (
                    <Link href={editorHref}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono uppercase text-xs border-primary/40 text-primary hover:bg-primary/10"
                      >
                        Generate in editor →
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            )}
          </div>

          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="redaction-bar text-xs">Demo Script</h2>
              {project.generated_demo_script && (
                <CopyLinkButton
                  value={project.generated_demo_script}
                  label="Copy demo script"
                />
              )}
            </div>
            {project.generated_demo_script ? (
              <ScriptCard text={project.generated_demo_script} />
            ) : (
              <CaseEmpty
                label="Transcript Unavailable"
                message="No 60-second demo script has been recorded. The owner can draft or generate one from the authoring console."
                cta={
                  isOwner ? (
                    <Link href={editorHref}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-mono uppercase text-xs border-primary/40 text-primary hover:bg-primary/10"
                      >
                        Generate in editor →
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

function BriefingCard({ text }: { text: string }) {
  const trimmed = text.trim();
  const splitAt = trimmed.search(/[.!?]\s/);
  const ledeEnd = splitAt === -1 ? trimmed.length : splitAt + 1;
  const lede = trimmed.slice(0, ledeEnd).trim();
  const rest = trimmed.slice(ledeEnd).trim();
  return (
    <article className="bg-card border border-card-border p-6 md:p-8 space-y-4">
      <p className="briefing-lede">{lede}</p>
      {rest && (
        <p className="font-serif text-sm md:text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {rest}
        </p>
      )}
    </article>
  );
}

function ScriptCard({ text }: { text: string }) {
  return (
    <article className="bg-card border border-card-border p-6 md:p-8 space-y-3">
      <div className="script-quote" aria-hidden="true"></div>
      <p className="font-sans text-sm md:text-base leading-relaxed text-foreground whitespace-pre-wrap">
        {text}
      </p>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground pt-2 border-t border-border">
        ≈ 60s read · spoken pacing
      </div>
    </article>
  );
}
