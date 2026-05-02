import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useExampleProject } from "@/hooks/use-api";
import { pad2 } from "@/components/dossier";
import {
  SEEDED_EXAMPLE_PATH,
  SECONDARY_EXAMPLE_PATH,
  SECONDARY_EXAMPLE_LABEL,
  type Project,
  type Milestone,
} from "@/lib/api";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editUrl, setEditUrl] = useState("");
  const { data: example, isError: exampleError } = useExampleProject();

  const handleResume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUrl) return;

    try {
      const url = new URL(editUrl);
      if (url.pathname.startsWith("/edit/")) {
        setLocation(url.pathname + url.search);
      } else {
        throw new Error("Invalid format");
      }
    } catch {
      toast({
        title: "Invalid edit link",
        description: "Please paste the full URL containing /edit/...",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout size="wide">
      <div className="flex flex-col gap-16 md:gap-24 py-4 md:py-10">
        {/* Cinematic two-column hero. Left: product copy + CTAs.
            Right: a real dossier preview built from the seeded example,
            so the first thing a visitor sees is "what a finished proof
            page looks like." On <lg the columns stack and the dossier
            preview lands below the hero copy. */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
          <HeroCopy />
          <DossierPreview example={example} exampleError={exampleError} />
        </section>

        {/* Lower band: smaller secondary actions + supporting line.
            Resume form is intentionally less prominent than the hero
            CTAs but still reachable. */}
        <section className="border-t border-border pt-10 md:pt-12 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8 md:gap-12 items-start">
          <div className="space-y-3 max-w-xl">
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Resume Active Case
            </div>
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground/80 uppercase">
              Already filed something? Paste the /edit/ URL you saved.
            </p>
            <form
              onSubmit={handleResume}
              className="flex flex-col sm:flex-row gap-2"
            >
              <Input
                placeholder="https://.../edit/..."
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="bg-background border-border font-mono h-11 sm:flex-1"
                aria-label="Edit URL"
              />
              <Button
                type="submit"
                variant="secondary"
                size="default"
                className="font-mono uppercase tracking-wider h-11 sm:w-40"
              >
                Open Editor
              </Button>
            </form>
          </div>

          <div className="space-y-2 md:text-right">
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Made for buildathons
            </div>
            <p className="font-serif text-sm text-muted-foreground italic leading-relaxed">
              No accounts. No setup. Open a case file, log evidence as you
              go, and ship a proof page judges can scan in 90 seconds.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function HeroCopy() {
  return (
    <div className="space-y-7 md:space-y-8 max-w-xl">
      <div className="font-mono text-[10px] sm:text-xs tracking-[0.2em] text-primary uppercase redaction-bar">
        Directive 001 · Document the Resurrection
      </div>
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.02] text-foreground">
        Your idea was{" "}
        <span className="text-muted-foreground/80 line-through decoration-destructive/70 decoration-[3px]">
          dead
        </span>{" "}
        this morning.
        <br />
        <span className="text-primary italic">Prove it's alive now.</span>
      </h1>
      <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
        Turn a 24-hour sprint into a judge-ready proof page: timeline,
        screenshots, blockers, breakthroughs, demo script, and before/after
        story.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Link href="/new" className="block">
          <Button
            size="lg"
            className="w-full sm:w-auto font-mono uppercase tracking-wider h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create Proof Page
          </Button>
        </Link>
        <Link href={SEEDED_EXAMPLE_PATH} className="block">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto font-mono uppercase tracking-wider h-14 px-8 border-border hover:bg-muted"
          >
            View Live Dossier
          </Button>
        </Link>
      </div>
      <div className="font-mono text-[10px] sm:text-xs tracking-widest text-muted-foreground/80 uppercase pt-1">
        Built for judges scanning progress, execution, and story.
      </div>
    </div>
  );
}

function DossierPreview({
  example,
  exampleError,
}: {
  example: Project | undefined;
  exampleError: boolean;
}) {
  if (exampleError) {
    return (
      <div className="relative">
        <div className="w-full min-h-[26rem] border border-dashed border-destructive/40 bg-destructive/5 flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-destructive/80 p-6 text-center">
          Example dossier unavailable.
          <br />
          The app still works — try "Create Proof Page".
        </div>
      </div>
    );
  }

  if (!example) {
    // Skeleton sized close to the real preview so the hero doesn't
    // collapse on first paint.
    return (
      <div className="relative">
        <div
          aria-hidden="true"
          className="w-full min-h-[26rem] border border-dashed border-border/60 bg-card/30 animate-pulse"
        />
      </div>
    );
  }

  const milestones = example.milestones ?? [];
  const exhibits = milestones.length;
  const breakthroughs = milestones.filter((m) => m.breakthrough).length;
  const blockers = milestones.filter((m) => m.blocker).length;
  // Prefer the first 3 milestones in stable sort_order so the preview
  // mirrors what a visitor will see when they open the full dossier.
  const previewMilestones = [...milestones]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 3);

  return (
    <div className="relative">
      {/* Soft amber/primary halo behind the card — subtle "this is the
          interesting thing" cue without overpowering the hero copy. */}
      <div
        aria-hidden="true"
        className="absolute -inset-4 md:-inset-6 bg-primary/5 blur-2xl rounded-[2rem] pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -top-8 -right-6 w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none"
      />

      <Link
        href={`/p/${example.slug}`}
        className="relative block group border-2 border-border bg-card/80 hover:border-primary/50 transition-colors p-6 md:p-7 shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            File ID #{String(example.id).padStart(4, "0")}
          </div>
          <div className="alive-pill">
            <div className="alive-dot"></div>
            Proof Status: Alive
          </div>
        </div>

        <div className="font-serif text-xl sm:text-2xl md:text-[1.7rem] text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
          {example.title}
        </div>
        <div className="font-serif text-sm md:text-base text-muted-foreground italic mb-6 leading-relaxed">
          {example.one_liner}
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
          <PreviewStat label="Exhibits" value={pad2(exhibits)} />
          <PreviewStat label="Breakthroughs" value={pad2(breakthroughs)} />
          <PreviewStat
            label="Blockers"
            value={blockers === 0 ? "Clean" : pad2(blockers)}
          />
        </div>

        {(example.starting_state || example.current_state) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
            <BeforeAfter
              label="Before"
              text={example.starting_state}
              tone="before"
            />
            <BeforeAfter
              label="After"
              text={example.current_state}
              tone="after"
            />
          </div>
        )}

        {previewMilestones.length > 0 && (
          <div className="space-y-2 mb-5">
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1">
              Evidence Timeline (first 3)
            </div>
            <ol className="space-y-1.5">
              {previewMilestones.map((m, idx) => (
                <MilestoneRow key={m.id} index={idx + 1} milestone={m} />
              ))}
            </ol>
          </div>
        )}

        <div className="border-t border-border pt-4 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Live seeded example
          </span>
          <span className="font-mono text-[10px] sm:text-xs uppercase text-primary tracking-widest opacity-90 group-hover:opacity-100">
            Open full dossier →
          </span>
        </div>
      </Link>

      {/* Secondary example: keeps the older fictional walk-through
          discoverable without competing with the featured meta-case. */}
      <div className="relative mt-3 text-center sm:text-right font-mono text-[10px] tracking-widest uppercase text-muted-foreground/80">
        Also see:{" "}
        <Link
          href={SECONDARY_EXAMPLE_PATH}
          className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
        >
          {SECONDARY_EXAMPLE_LABEL} →
        </Link>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background/50 px-3 py-2 md:px-4 md:py-3">
      <div className="font-mono text-[9px] md:text-[10px] tracking-widest uppercase text-muted-foreground truncate">
        {label}
      </div>
      <div className="font-serif text-base md:text-lg text-foreground truncate">
        {value}
      </div>
    </div>
  );
}

function BeforeAfter({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "before" | "after";
}) {
  return (
    <div className="border border-border bg-background/40 p-3 min-w-0">
      <div
        className={
          tone === "before"
            ? "font-mono text-[9px] uppercase tracking-widest text-destructive/80 mb-1"
            : "font-mono text-[9px] uppercase tracking-widest text-primary mb-1"
        }
      >
        {label}
      </div>
      <p className="font-serif text-xs sm:text-[13px] text-muted-foreground leading-snug line-clamp-3">
        {text || "—"}
      </p>
    </div>
  );
}

function MilestoneRow({
  index,
  milestone,
}: {
  index: number;
  milestone: Milestone;
}) {
  const tag = milestone.breakthrough
    ? { label: "Breakthrough", className: "text-primary border-primary/40" }
    : milestone.blocker
      ? {
          label: "Blocker",
          className: "text-destructive border-destructive/40",
        }
      : { label: "Evidence", className: "text-muted-foreground border-border" };
  return (
    <li className="flex items-center gap-3 min-w-0">
      <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums shrink-0 w-5">
        {pad2(index)}
      </span>
      <span className="font-serif text-sm text-foreground truncate flex-1 min-w-0">
        {milestone.title}
      </span>
      <span
        className={`font-mono text-[9px] uppercase tracking-widest border px-1.5 py-0.5 shrink-0 ${tag.className}`}
      >
        {tag.label}
      </span>
    </li>
  );
}
