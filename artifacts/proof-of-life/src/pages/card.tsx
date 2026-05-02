import { useRoute, Link } from "wouter";
import { Layout, DossierSkeleton } from "@/components/layout";
import { useProjectBySlug } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

export default function CardPage() {
  const [, params] = useRoute("/card/:slug");
  const slug = params?.slug;
  const { data: project, isLoading, isError } = useProjectBySlug(slug!);

  if (isLoading) return <Layout><DossierSkeleton /></Layout>;
  if (isError || !project) return <Layout><div className="text-center py-20 text-destructive font-mono uppercase">Case file not found.</div></Layout>;

  const sortedMilestones = [...(project.milestones || [])].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );
  
  const firstBreakthrough = sortedMilestones.find(m => m.breakthrough);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-8 bg-black dossier-noise">
      
      {/* Action Bar (Not part of the screenshot area) */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-6 relative z-10">
        <Link href={`/p/${project.slug}`}>
          <Button variant="ghost" className="font-mono text-xs uppercase text-muted-foreground hover:text-foreground">
            ← Back to Dossier
          </Button>
        </Link>
        <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          Evidence Card
        </div>
      </div>

      {/* The Card (Screenshot Target) */}
      <div className="w-full max-w-[800px] bg-card border border-border relative overflow-hidden shadow-2xl shadow-black/50">
        {/* Decorative corner brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/50"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/50"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/50"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/50"></div>

        <div className="p-8 md:p-12 space-y-10">
          {/* Header Row */}
          <div className="flex justify-between items-start border-b border-border pb-6">
            <div className="space-y-2">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Proof of Life // ID: {String(project.id).padStart(4, '0')}
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground leading-tight">
                {project.title}
              </h1>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
              <div className="alive-pill text-xs">
                <div className="alive-dot"></div>
                ALIVE
              </div>
              <div className="font-mono text-[10px] text-muted-foreground uppercase text-right">
                Filed by<br/>
                <span className="text-foreground">{project.builder_name}</span>
              </div>
            </div>
          </div>

          {/* One Liner */}
          <div className="text-xl md:text-2xl font-serif text-primary italic text-center max-w-2xl mx-auto border-y border-border py-6">
            "{project.one_liner}"
          </div>

          {/* State Comparison */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3 relative">
              <div className="redaction-bar text-[10px]">Before State</div>
              <p className="font-sans text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                {project.starting_state}
              </p>
            </div>
            <div className="space-y-3 relative">
              <div className="redaction-bar text-[10px] bg-primary text-primary-foreground">Current State</div>
              <p className="font-sans text-sm text-foreground line-clamp-4 leading-relaxed">
                {project.current_state || "Monitoring ongoing..."}
              </p>
            </div>
          </div>

          {/* Key Stats / Footer Row */}
          <div className="grid grid-cols-3 border-t border-border pt-6 mt-8">
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Exhibits</div>
              <div className="font-serif text-2xl">{project.milestones?.length || 0}</div>
            </div>
            <div className="space-y-1 col-span-2 pl-6 border-l border-border">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Key Breakthrough</div>
              <div className="font-serif text-lg font-bold text-foreground truncate">
                {firstBreakthrough ? firstBreakthrough.title : "In progress..."}
              </div>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
