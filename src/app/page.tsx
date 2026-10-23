import React from "react";
import Link from "next/link";
import { 
  FolderKanban, 
  Users, 
  Eye, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Layers,
  Lock,
  ExternalLink
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground ambient-canvas">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/80 bg-card/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 items-center justify-center rounded-xl bg-primary px-3.5 shadow-md shadow-primary/20">
            <span className="font-display text-sm font-bold tracking-wider text-primary-foreground">CREWVIA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-tight text-foreground">VANGUARD</span>
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200 sm:inline-block">
              Zero-Trust Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-secondary hover:border-foreground/20 shadow-xs"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Admin Workspace</span>
          </Link>
          <Link
            href="/developer"
            className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all active:scale-95"
          >
            <span>Developer Portal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero / Overview Section */}
      <main className="flex-1 px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end pb-6 border-b border-border/50">
            <div>
              <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Executive Agency Visual Workspace</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                Advanced Client Review & Zero-Trust Portal
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base max-w-3xl leading-relaxed">
                Empower your agency with interactive multi-device website previews, pixel-accurate pinpoint visual annotations, task progression kanban, and one-click zero-trust WordPress access brokering.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                System Active & Sentinel Armed
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid (4 Columns) */}
          <div className="mb-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Active Client Sites</span>
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FolderKanban className="size-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">4</span>
                <span className="text-xs text-muted-foreground">managed domains</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Team Roster</span>
                <div className="size-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-700">
                  <Users className="size-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">8</span>
                <span className="text-xs text-muted-foreground">scoped developers</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Visual Annotations</span>
                <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700">
                  <Eye className="size-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">24</span>
                <span className="text-xs font-semibold text-emerald-700">15 resolved</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Zero-Trust WP Sites</span>
                <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                  <Lock className="size-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">100%</span>
                <span className="text-xs text-muted-foreground">AES-256 Vaulted</span>
              </div>
            </div>
          </div>

          {/* Feature Showcase Pillars (3 Columns) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Link
              href="/admin/projects"
              className="group rounded-3xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <Eye className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground tracking-tight">
                Responsive Visual Annotator
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Inspect responsive client viewports (Desktop, Tablet, Mobile) with real-time zooming and canvas scaling. Drop pinpoint markers with threaded replies and status tracking.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                <span>Launch Visual Canvas</span>
                <ArrowRight className="size-3.5" />
              </div>
            </Link>

            <Link
              href="/admin/projects"
              className="group rounded-3xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-all">
                <FolderKanban className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground tracking-tight">
                Agency Project Management
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Configure client projects, manage multi-page inspection paths, assign developers with auto-expiring access, and generate scoped client share links (Viewer vs Commenter).
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-sky-700 group-hover:translate-x-1 transition-transform">
                <span>Manage Client Projects</span>
                <ArrowRight className="size-3.5" />
              </div>
            </Link>

            <Link
              href="/developer"
              className="group rounded-3xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <KeyRound className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground tracking-tight">
                Zero-Trust WordPress Broker
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Developers log in via one-click single-use session tokens through the browser companion. Master credentials never leak, and capability sentinels block code editing and email snooping.
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 group-hover:translate-x-1 transition-transform">
                <span>Open Developer Portal</span>
                <ArrowRight className="size-3.5" />
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/80 bg-card/60 px-6 py-4 text-center text-xs text-muted-foreground">
        Crewvia Vanguard &bull; Advanced Agency Visual Annotator & Zero-Trust Access Broker
      </footer>
    </div>
  );
}
