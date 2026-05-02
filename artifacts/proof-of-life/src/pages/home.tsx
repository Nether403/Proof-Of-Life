import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useExampleProject } from "@/hooks/use-api";
import { pad2 } from "@/components/dossier";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editUrl, setEditUrl] = useState("");
  const { data: example } = useExampleProject();

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

  const exampleStats = example
    ? {
        exhibits: example.milestones?.length ?? 0,
        breakthroughs: (example.milestones ?? []).filter(
          (m) => m.breakthrough,
        ).length,
        blockers: (example.milestones ?? []).filter((m) => m.blocker).length,
      }
    : null;

  return (
    <Layout>
      <div className="flex flex-col min-h-[80vh] justify-center space-y-12 md:space-y-16">
        <div className="space-y-5 max-w-2xl">
          <div className="font-mono text-xs sm:text-sm tracking-widest text-primary uppercase redaction-bar">
            Directive 001
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05]">
            Document the
            <br />
            <span className="text-primary italic">resurrection.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
            A builder spends 24 hours bringing a dead project back to life.
            This is the autopsy-turned-resurrection — a judge-ready,
            shareable case file built from the evidence of your sprint.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-5">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase border-b border-border pb-2">
              Begin Investigation
            </h2>
            <div className="space-y-3">
              <Link href="/new" className="block w-full">
                <Button
                  size="lg"
                  className="w-full font-mono uppercase tracking-wider h-14 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  File New Evidence
                </Button>
              </Link>
              {example && (
                <Link href={`/p/${example.slug}`} className="block w-full">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full font-mono uppercase tracking-wider h-14 border-border hover:bg-muted"
                  >
                    See Example Case
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase border-b border-border pb-2">
              Resume Active Case
            </h2>
            <form onSubmit={handleResume} className="space-y-3">
              <Input
                placeholder="Paste your /edit/... link here"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="bg-background border-border font-mono h-14"
              />
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                className="w-full font-mono uppercase tracking-wider h-14"
              >
                Access Records
              </Button>
            </form>
          </div>
        </div>

        {/* "What a filed case looks like" preview — links into the seeded
            example so the empty front desk is never the only thing a judge
            sees on a fresh visit. */}
        {example && exampleStats && (
          <Link
            href={`/p/${example.slug}`}
            className="block group border border-border bg-card/40 hover:bg-card/60 hover:border-primary/40 transition-colors p-5 md:p-6"
          >
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                What a filed case looks like
              </div>
              <div className="alive-pill">
                <div className="alive-dot"></div>
                Alive
              </div>
            </div>
            <div className="font-serif text-lg sm:text-xl md:text-2xl text-foreground mb-1 leading-snug group-hover:text-primary transition-colors">
              {example.title}
            </div>
            <div className="font-serif text-sm text-muted-foreground italic mb-4 max-w-2xl">
              {example.one_liner}
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <PreviewStat
                label="Exhibits"
                value={`${pad2(exampleStats.exhibits)}`}
              />
              <PreviewStat
                label="Breakthroughs"
                value={`${pad2(exampleStats.breakthroughs)}`}
              />
              <PreviewStat
                label="Blockers"
                value={
                  exampleStats.blockers === 0
                    ? "Clean"
                    : pad2(exampleStats.blockers)
                }
              />
            </div>
            <div className="mt-4 text-right font-mono text-[10px] sm:text-xs uppercase text-primary tracking-widest opacity-80 group-hover:opacity-100">
              View full dossier →
            </div>
          </Link>
        )}
      </div>
    </Layout>
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
