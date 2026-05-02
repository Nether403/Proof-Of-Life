import { useRoute } from "wouter";
import { Layout, DossierSkeleton } from "@/components/layout";
import { useProjectBySlug } from "@/hooks/use-api";

export default function ProofPage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug;
  const { data: project, isLoading, isError } = useProjectBySlug(slug!);

  if (isLoading) return <Layout><DossierSkeleton /></Layout>;
  
  if (isError || !project) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="font-mono text-sm tracking-widest text-destructive uppercase border border-destructive/30 px-3 py-1">
            Error 404
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-foreground">Case File Sealed</h1>
          <p className="text-muted-foreground font-mono text-sm max-w-md">
            The requested evidence could not be located. It may have been redacted, destroyed, or never filed.
          </p>
        </div>
      </Layout>
    );
  }

  // Update page title
  if (typeof document !== 'undefined') {
    document.title = `${project.title} — Proof of Life`;
  }

  // Order matches the editor's reorder UI: explicit sort_order is primary,
  // occurred_at is the stable tiebreaker so newly-filed evidence still falls
  // into chronological place when sort_order ties.
  const sortedMilestones = [...(project.milestones || [])].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
  });
  
  const firstBreakthrough = sortedMilestones.find(m => m.breakthrough);
  const blockers = sortedMilestones.filter(m => m.blocker);

  return (
    <Layout>
      <div className="space-y-24 pb-20">
        
        {/* Header Header */}
        <header className="space-y-8 border-b border-border pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                File ID: #{String(project.id).padStart(4, '0')}
              </div>
              <h1 className="font-serif text-5xl md:text-7xl font-bold text-foreground leading-tight">
                {project.title}
              </h1>
              <div className="text-xl font-serif text-muted-foreground italic">
                {project.one_liner}
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end gap-4 min-w-[200px]">
              <div className="alive-pill">
                <div className="alive-dot"></div>
                Proof status: Alive
              </div>
              <div className="text-right space-y-1 w-full border-t border-border pt-4">
                <div className="font-mono text-xs text-muted-foreground uppercase flex justify-between">
                  <span>Filed by:</span>
                  <span className="text-foreground">{project.builder_name}</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground uppercase flex justify-between">
                  <span>Exhibits filed:</span>
                  <span className="text-foreground">{project.milestones?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 1. Initial Condition */}
        <section className="space-y-6">
          <h2 className="redaction-bar text-sm">Initial Condition</h2>
          <div className="bg-card border border-card-border p-8 font-serif text-lg leading-relaxed text-muted-foreground">
            <p className="whitespace-pre-wrap">{project.starting_state || "No prior state recorded."}</p>
          </div>
        </section>

        {/* 3. Moment of Animation (Hero Breakthrough) */}
        {firstBreakthrough && (
          <section className="space-y-6 bg-primary/5 border border-primary/20 p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <h2 className="font-mono text-xs tracking-widest text-primary uppercase mb-2">Moment of Animation</h2>
            <h3 className="font-serif text-3xl md:text-4xl text-foreground font-bold">{firstBreakthrough.title}</h3>
            {firstBreakthrough.description && (
              <p className="font-sans text-muted-foreground max-w-2xl text-lg mt-4">{firstBreakthrough.description}</p>
            )}
            {firstBreakthrough.screenshot_data && (
              <div className="mt-8 border border-primary/30 p-2 bg-background">
                <img src={firstBreakthrough.screenshot_data} alt="Breakthrough Exhibit" className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-700" />
                <div className="font-mono text-xs text-primary/70 uppercase mt-2 text-right">Primary Artifact</div>
              </div>
            )}
          </section>
        )}

        {/* 2. Evidence Timeline */}
        <section className="space-y-8">
          <h2 className="redaction-bar text-sm">Evidence Timeline</h2>
          <div className="relative pl-6 md:pl-8 border-l border-border space-y-12 py-4">
            {sortedMilestones.map((m, i) => (
              <div key={m.id} className="relative stagger-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`absolute -left-[33px] md:-left-[41px] top-1 w-4 h-4 rounded-full border-2 border-background ${
                  m.breakthrough ? "bg-primary" : m.blocker ? "bg-destructive" : "bg-muted-foreground"
                }`}></div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <time className="font-mono text-xs text-muted-foreground">
                      {new Date(m.occurred_at).toLocaleString()}
                    </time>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                      m.breakthrough ? "bg-primary/10 text-primary border-primary/30" : 
                      m.blocker ? "bg-destructive/10 text-destructive border-destructive/30" : 
                      "bg-secondary/50 text-secondary-foreground border-border"
                    }`}>
                      {m.breakthrough ? "Breakthrough" : m.blocker ? "Blocker survived" : "Update"}
                    </span>
                  </div>
                  
                  <h3 className="font-serif text-xl font-bold">{m.title}</h3>
                  
                  {m.description && (
                    <p className="font-sans text-muted-foreground max-w-2xl">{m.description}</p>
                  )}
                  
                  {m.screenshot_data && (
                    <div className="mt-4 border border-border p-1 bg-card max-w-2xl">
                      <img src={m.screenshot_data} alt="Exhibit" className="w-full h-auto" />
                      <div className="font-mono text-[10px] text-muted-foreground uppercase mt-1 text-right">
                        Exhibit {String(i+1).padStart(2, '0')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Survived Blockers */}
        {blockers.length > 0 && (
          <section className="space-y-6">
            <h2 className="redaction-bar text-sm bg-destructive text-destructive-foreground">Survived Blockers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blockers.map((b, i) => (
                <div key={b.id} className="border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <div className="font-mono text-[10px] text-destructive uppercase tracking-widest">Incident {String(i+1).padStart(2,'0')}</div>
                  <h3 className="font-serif text-foreground font-bold">{b.title}</h3>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. Current Vital Signs */}
        <section className="space-y-6 border-t border-border pt-12">
          <h2 className="redaction-bar text-sm">Current Vital Signs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Current State</h3>
              <p className="font-serif text-lg leading-relaxed">{project.current_state || "Monitoring ongoing..."}</p>
            </div>
            <div className="space-y-6 bg-card border border-card-border p-6">
              <div className="space-y-1">
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Alive Since</div>
                <div className="font-mono text-sm">{project.start_time ? new Date(project.start_time).toLocaleString() : "Unknown"}</div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-border">
                {project.replit_url && (
                  <a href={project.replit_url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline font-mono text-sm uppercase tracking-wider">
                    → View Source
                  </a>
                )}
                {project.demo_url && (
                  <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline font-mono text-sm uppercase tracking-wider">
                    → Access Live Subject
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 6. Judge Briefing & 7. Demo Script */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border pt-12">
          <div className="space-y-4">
            <h2 className="redaction-bar text-sm">Judge Briefing</h2>
            <div className="bg-card border border-card-border p-6 min-h-[200px]">
              {project.generated_summary ? (
                <div className="prose prose-invert font-serif prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{project.generated_summary}</p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-xs text-muted-foreground uppercase tracking-widest border border-dashed border-border p-8 text-center">
                  Briefing not yet compiled
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="redaction-bar text-sm">Demo Script</h2>
            <div className="bg-card border border-card-border p-6 min-h-[200px]">
              {project.generated_demo_script ? (
                <div className="font-sans text-sm leading-relaxed text-muted-foreground italic">
                  <p className="whitespace-pre-wrap">"{project.generated_demo_script}"</p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center font-mono text-xs text-muted-foreground uppercase tracking-widest border border-dashed border-border p-8 text-center">
                  Transcript unavailable
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
