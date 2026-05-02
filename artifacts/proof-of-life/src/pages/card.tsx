import { useRoute, Link } from "wouter";
import { Layout, DossierSkeleton } from "@/components/layout";
import { useProjectBySlug } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { CaseEmpty, formatDuration, pad2 } from "@/components/dossier";

export default function CardPage() {
  const [, params] = useRoute("/card/:slug");
  const slug = params?.slug;
  const { data: project, isLoading, isError } = useProjectBySlug(slug!);

  if (isLoading)
    return (
      <Layout>
        <DossierSkeleton />
      </Layout>
    );
  if (isError || !project)
    return (
      <Layout>
        <div className="py-12">
          <CaseEmpty
            label="404"
            message="No case file at this address. Verify the URL or check the seeded example."
            cta={
              <Link href="/">
                <Button
                  variant="outline"
                  className="font-mono uppercase text-xs border-border"
                >
                  Return to front desk
                </Button>
              </Link>
            }
          />
        </div>
      </Layout>
    );

  const sortedMilestones = [...(project.milestones || [])].sort(
    (a, b) =>
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  const firstBreakthrough = sortedMilestones.find((m) => m.breakthrough);
  const blockers = sortedMilestones.filter((m) => m.blocker);
  const startMs = project.start_time
    ? new Date(project.start_time).getTime()
    : null;
  const timeToPrototypeMs =
    startMs && firstBreakthrough
      ? new Date(firstBreakthrough.occurred_at).getTime() - startMs
      : null;
  const blockerLabel =
    blockers.length === 0 ? "Clean run" : `${pad2(blockers.length)} survived`;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 bg-black dossier-noise">
      {/* Action Bar (Not part of the screenshot area) */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4 md:mb-6 relative z-10 gap-3">
        <Link href={`/p/${project.slug}`}>
          <Button
            variant="ghost"
            className="font-mono text-[10px] sm:text-xs uppercase text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Button>
        </Link>
        <div className="font-mono text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest">
          Evidence Card
        </div>
      </div>

      {/* The Card (Screenshot Target) */}
      <div className="w-full max-w-[800px] bg-card border border-border relative overflow-hidden shadow-2xl shadow-black/50">
        {/* Decorative corner brackets */}
        <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-primary/50"></div>
        <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-primary/50"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-primary/50"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-primary/50"></div>

        <div className="p-5 sm:p-8 md:p-12 space-y-6 sm:space-y-8 md:space-y-10">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-border pb-5 sm:pb-6 gap-3">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Proof of Life // ID: {String(project.id).padStart(4, "0")}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-5xl font-bold text-foreground leading-tight break-words">
                {project.title}
              </h1>
            </div>
            <div className="flex sm:flex-col sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 shrink-0">
              <div className="alive-pill text-xs">
                <div className="alive-dot"></div>
                ALIVE
              </div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase sm:text-right">
                Filed by{" "}
                <span className="text-foreground">{project.builder_name}</span>
              </div>
            </div>
          </div>

          {/* One Liner */}
          <div className="text-base sm:text-xl md:text-2xl font-serif text-primary italic text-center max-w-2xl mx-auto border-y border-border py-4 sm:py-6 leading-snug">
            "{project.one_liner}"
          </div>

          {/* State Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
            <div className="space-y-2 sm:space-y-3 relative">
              <div className="redaction-bar text-[10px]">Before State</div>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                {project.starting_state}
              </p>
            </div>
            <div className="space-y-2 sm:space-y-3 relative">
              <div className="redaction-bar text-[10px] bg-primary text-primary-foreground">
                Current State
              </div>
              <p className="font-sans text-xs sm:text-sm text-foreground line-clamp-4 leading-relaxed">
                {project.current_state || "Monitoring ongoing..."}
              </p>
            </div>
          </div>

          {/* Condensed stat strip — mirrors the public proof page so the
              shareable card carries the same vitals: time from corpse to
              prototype, exhibit count, blocker survival, and the headline
              breakthrough. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border pt-5 sm:pt-6 mt-6 sm:mt-8 gap-3">
            <div className="space-y-1">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">
                Time to prototype
              </div>
              <div className="font-serif text-xl sm:text-2xl">
                {formatDuration(timeToPrototypeMs)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">
                Exhibits
              </div>
              <div className="font-serif text-xl sm:text-2xl">
                {pad2(sortedMilestones.length)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">
                Blocker survived
              </div>
              <div className="font-serif text-base sm:text-lg leading-tight">
                {blockerLabel}
              </div>
            </div>
            <div className="space-y-1 min-w-0 col-span-2 sm:col-span-1 sm:pl-4 sm:border-l sm:border-border">
              <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground">
                Key breakthrough
              </div>
              <div className="font-serif text-sm sm:text-base font-bold text-foreground line-clamp-2">
                {firstBreakthrough ? firstBreakthrough.title : "In progress..."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
