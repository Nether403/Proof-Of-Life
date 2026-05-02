import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="py-24 flex flex-col items-center text-center space-y-6">
        <div className="redaction-bar">Case File Not Found</div>
        <h1 className="font-serif text-4xl">No record at this location.</h1>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground max-w-md">
          The dossier you requested has been redacted, never filed, or moved to
          another archive. Verify the URL or return to the front desk.
        </p>
        <Link href="/">
          <Button
            variant="outline"
            className="font-mono uppercase text-xs border-primary/40 text-primary hover:bg-primary/10"
          >
            Return to front desk
          </Button>
        </Link>
      </div>
    </Layout>
  );
}
