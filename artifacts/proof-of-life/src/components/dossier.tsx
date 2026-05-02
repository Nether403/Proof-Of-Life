import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export function CopyLinkButton({
  value,
  label = "Copy share link",
  className,
  variant = "outline",
  size = "sm",
  onCopied,
  onCopyFailed,
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: "outline" | "secondary" | "default" | "ghost";
  size?: "default" | "sm" | "lg";
  onCopied?: () => void;
  onCopyFailed?: (err: unknown) => void;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (copied) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      onCopyFailed?.(err);
      return;
    }
    setCopied(true);
    onCopied?.();
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onCopy}
      disabled={copied}
      aria-live="polite"
      className={cn(
        "font-mono uppercase text-xs tracking-wider",
        copied && "border-primary/60 text-primary",
        className,
      )}
    >
      {copied ? "Copied ✓" : label}
    </Button>
  );
}

export function CaseEmpty({
  label,
  message,
  cta,
  className,
}: {
  label: string;
  message: string;
  cta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-border/70 bg-card/30 p-6 md:p-8 flex flex-col items-center justify-center text-center gap-3",
        className,
      )}
    >
      <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
        {label}
      </div>
      <p className="font-serif text-base text-muted-foreground italic max-w-md leading-relaxed">
        {message}
      </p>
      {cta && <div className="pt-1">{cta}</div>}
    </div>
  );
}

export function ScreenshotLightbox({
  trigger,
  src,
  caption,
  description,
  timestamp,
  exhibit,
}: {
  trigger: React.ReactNode;
  src: string;
  caption: string;
  description?: string;
  timestamp: string;
  exhibit: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3 pr-8">
            <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {exhibit}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {timestamp}
            </div>
          </div>
          <DialogTitle asChild>
            <h3 className="font-serif text-xl md:text-2xl text-foreground">
              {caption}
            </h3>
          </DialogTitle>
          <div className="border border-border bg-background">
            <img
              src={src}
              alt={caption}
              className="w-full h-auto max-h-[65vh] object-contain mx-auto"
            />
          </div>
          {description && (
            <p className="font-sans text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-border bg-card/40 px-3 py-3 md:px-4 md:py-4 flex flex-col gap-1.5 min-w-0",
        className,
      )}
    >
      <div className="font-mono text-[9px] md:text-[10px] tracking-widest uppercase text-muted-foreground truncate">
        {label}
      </div>
      <div className="font-serif text-base md:text-lg text-foreground leading-tight truncate">
        {value}
      </div>
      {hint && (
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/80 truncate">
          {hint}
        </div>
      )}
    </div>
  );
}
