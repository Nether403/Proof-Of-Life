import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useExampleProject } from "@/hooks/use-api";

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
      if (url.pathname.startsWith('/edit/')) {
        setLocation(url.pathname + url.search);
      } else {
        throw new Error("Invalid format");
      }
    } catch {
      toast({
        title: "Invalid edit link",
        description: "Please paste the full URL containing /edit/...",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-[80vh] justify-center space-y-16">
        <div className="space-y-6 max-w-2xl">
          <div className="font-mono text-sm tracking-widest text-primary uppercase redaction-bar">
            Directive 001
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight">
            Document the <br/><span className="text-primary italic">resurrection.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            A builder spends 24 hours bringing a dead project back to life. 
            This is the autopsy-turned-resurrection. Turn your sprint into a judge-ready, 
            shareable evidence record.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase border-b border-border pb-2">
              Begin Investigation
            </h2>
            <div className="space-y-4">
              <Link href="/new" className="w-full">
                <Button size="lg" className="w-full font-mono uppercase tracking-wider h-14 bg-primary text-primary-foreground hover:bg-primary/90">
                  File New Evidence
                </Button>
              </Link>
              {example && (
                <Link href={`/p/${example.slug}`} className="w-full">
                  <Button variant="outline" size="lg" className="w-full font-mono uppercase tracking-wider h-14 border-border hover:bg-muted">
                    See Example Case
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase border-b border-border pb-2">
              Resume Active Case
            </h2>
            <form onSubmit={handleResume} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Paste your /edit/... link here" 
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="bg-background border-border font-mono h-14"
                />
              </div>
              <Button type="submit" variant="secondary" size="lg" className="w-full font-mono uppercase tracking-wider h-14">
                Access Records
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
