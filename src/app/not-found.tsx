import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground ambient-canvas dot-grid">
      <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm max-w-md w-full">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mb-2">
          Page Not Found
        </h2>
        <p className="text-xs text-muted-foreground mb-6">
          The requested page, project workspace, or shared link could not be located.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Platform Home</span>
        </Link>
      </div>
    </div>
  );
}
