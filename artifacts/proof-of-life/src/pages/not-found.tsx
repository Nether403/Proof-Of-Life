import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="py-16 md:py-24 flex flex-col items-center text-center space-y-6">
        <div className="redaction-bar">Case File Not Found</div>
        <h1 className="font-serif text-3xl sm:text-4xl">
          No record at this location.
        </h1>
        <p className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground max-w-md leading-relaxed">
          The dossier you requested has been redacted, never filed, or moved to
          another archive. Verify the URL or return to the front desk.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full font-mono uppercase text-xs border-border"
            >
              Return to front desk
            </Button>
          </Link>
          <Link
            href="/p/alive-or-dead-the-deadwords-resurrection"
            className="w-full sm:w-auto"
          >
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
