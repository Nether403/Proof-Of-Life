import { Link } from "wouter";
import { cn } from "@/lib/utils";

export type LayoutSize = "default" | "wide";

const SIZE_CLASSES: Record<LayoutSize, string> = {
  default: "max-w-4xl",
  wide: "max-w-7xl",
};

export function Layout({
  children,
  size = "default",
}: {
  children: React.ReactNode;
  size?: LayoutSize;
}) {
  const widthClass = SIZE_CLASSES[size];
  return (
    <div className="min-h-[100dvh] flex flex-col dossier-noise">
      <main
        className={cn(
          "flex-1 w-full mx-auto px-4 py-6 md:p-12 relative z-10",
          widthClass,
        )}
      >
        {children}
      </main>
      <footer className="w-full border-t border-border mt-auto relative z-10">
        <div
          className={cn(
            "mx-auto px-4 py-4 md:px-12 md:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest",
            widthClass,
          )}
        >
          <span>Proof of Life &mdash; Evidence Bureau</span>
          <Link href="/" className="hover:text-primary transition-colors">
            File Evidence
          </Link>
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
