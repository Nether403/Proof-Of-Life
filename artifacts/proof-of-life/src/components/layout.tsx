import { Link } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col dossier-noise">
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-12 relative z-10">
        {children}
      </main>
      <footer className="w-full border-t border-border mt-auto relative z-10">
        <div className="max-w-4xl mx-auto p-6 md:px-12 flex items-center justify-between font-mono text-xs text-muted-foreground uppercase tracking-widest">
          <span>Proof of Life &mdash; Evidence Bureau</span>
          <Link href="/" className="hover:text-primary transition-colors">File Evidence</Link>
        </div>
      </footer>
    </div>
  );
}

export function DossierSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-4 w-32 bg-border"></div>
      <div className="h-16 w-3/4 bg-border"></div>
      <div className="h-px w-full bg-border"></div>
      <div className="space-y-4">
        <div className="h-4 w-full bg-border"></div>
        <div className="h-4 w-5/6 bg-border"></div>
        <div className="h-4 w-4/6 bg-border"></div>
      </div>
    </div>
  );
}
