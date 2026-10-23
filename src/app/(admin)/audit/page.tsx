"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowLeft,
  KeyRound,
  Lock,
  Globe,
  AlertTriangle,
  UserX,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Code,
  CheckCircle2,
  X,
  Loader2,
  Users
} from "lucide-react";
import { CredentialVaultModal } from "@/components/admin/CredentialVaultModal";
import Portal from "@/components/layout/Portal";
import { Skeleton } from "@/components/ui/Skeleton";

interface AuditLogItem {
  id: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, any> | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    clientName: string;
    targetUrl: string;
  } | null;
}

interface AuditStats {
  totalLogins: number;
  totalRevocations: number;
  sentinelBlocks: number;
  totalEvents: number;
}

interface ActionOption {
  action: string;
  count: number;
}

export default function AdminAuditDashboardPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalLogins: 0,
    totalRevocations: 0,
    sentinelBlocks: 0,
    totalEvents: 0,
  });
  const [availableActions, setAvailableActions] = useState<ActionOption[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedProjectId, setSelectedProjectId] = useState("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Inspect detail modal
  const [inspectingLog, setInspectingLog] = useState<AuditLogItem | null>(null);

  // Vault modal state
  const [vaultProjectId, setVaultProjectId] = useState<string | null>(null);
  const [vaultProjectName, setVaultProjectName] = useState("");

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedAction !== "ALL") params.set("action", selectedAction);
      if (selectedProjectId !== "ALL") params.set("projectId", selectedProjectId);
      params.set("limit", pageSize.toString());
      params.set("offset", (page * pageSize).toString());

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalCount(data.total || 0);
        if (data.stats) setStats(data.stats);
        if (data.availableActions) setAvailableActions(data.availableActions);
        if (data.filterOptions?.projects) setProjects(data.filterOptions.projects);
      } else if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load audit logs.");
      }
    } catch {
      setErrorMessage("Network error connecting to audit logging engine.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedAction, selectedProjectId, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchAuditLogs();
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "SECURITY_SENTINEL_BLOCKED":
        return "bg-rose-100 text-rose-900 border-rose-300";
      case "WP_SESSION_REVOKED":
      case "WP_ALL_SESSIONS_REVOKED":
      case "ASSIGNMENT_REVOKED":
        return "bg-red-100 text-red-900 border-red-300";
      case "WP_LOGIN_GRANT_DISPATCHED":
      case "WP_SESSION_CLAIMED":
      case "WP_ADMIN_LAUNCHED":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "CREDENTIALS_VAULTED":
        return "bg-teal-100 text-teal-900 border-teal-300";
      case "PROJECT_CREATED":
      case "ASSIGNMENT_CREATED":
        return "bg-blue-100 text-blue-900 border-blue-300";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  const formatActionName = (action: string) => {
    return action.replace(/_/g, " ");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span>Immutable Ledger &bull; Real-Time Access Sentinels</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Security Audit Logs & Vault
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Complete oversight of WordPress session grants, zero-trust logins, runtime capability blocks, and credential changes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Activity</span>
          </button>
        </div>
      </div>

        {/* Executive Security Metrics Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              <span>Total Events</span>
              <div className="size-7 sm:size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 font-display text-xl sm:text-3xl font-bold tracking-tight text-foreground">{stats.totalEvents}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Immutable ledger rows recorded</div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-800 uppercase tracking-wider font-semibold">
              <span>WP Logins & Grants</span>
              <div className="size-7 sm:size-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <KeyRound className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 font-display text-xl sm:text-3xl font-bold tracking-tight text-emerald-700">{stats.totalLogins}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Zero-plugin single-use logins</div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-rose-800 uppercase tracking-wider font-semibold">
              <span>Sentinel Blocks</span>
              <div className="size-7 sm:size-8 rounded-xl bg-rose-100 flex items-center justify-center text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 font-display text-xl sm:text-3xl font-bold tracking-tight text-destructive">{stats.sentinelBlocks}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Restricted file editor attempts blocked</div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-amber-800 uppercase tracking-wider font-semibold">
              <span>Access Revocations</span>
              <div className="size-7 sm:size-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <UserX className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 font-display text-xl sm:text-3xl font-bold tracking-tight text-amber-700">{stats.totalRevocations}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Instant cookie purges executed</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by action, developer email, IP address, or project..."
                className="w-full rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 outline-none shadow-xs transition-colors"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/25 outline-none shadow-xs cursor-pointer"
            >
              <option value="ALL">All Event Types</option>
              {availableActions.map((a) => (
                <option key={a.action} value={a.action}>
                  {formatActionName(a.action)} ({a.count})
                </option>
              ))}
            </select>

            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/25 outline-none shadow-xs cursor-pointer"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Event Action</th>
                  <th className="px-5 py-3.5">Actor / User</th>
                  <th className="px-5 py-3.5">Project Target</th>
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i} className="divide-x divide-transparent">
                      <td className="px-5 py-4"><Skeleton className="h-3.5 w-28 rounded-md" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-5 w-24 rounded-md" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-3.5 w-32 rounded-md" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-3.5 w-24 rounded-md" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-3.5 w-20 rounded-md" /></td>
                      <td className="px-5 py-4 text-right"><Skeleton className="h-7 w-16 rounded-lg ml-auto" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                      <p className="font-semibold text-foreground">No matching audit logs found</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Try resetting your filter or search query.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const formattedDate = new Date(log.timestamp).toLocaleString();
                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap" title={log.timestamp}>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {formatActionName(log.action)}
                          </span>
                        </td>

                        {/* Actor */}
                        <td className="px-5 py-3.5">
                          {log.user ? (
                            <div>
                              <div className="font-semibold text-foreground">{log.user.name}</div>
                              <div className="text-[11px] text-muted-foreground">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">System / Client</span>
                          )}
                        </td>

                        {/* Project */}
                        <td className="px-5 py-3.5">
                          {log.project ? (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-semibold text-foreground">{log.project.name}</div>
                                <div className="text-[11px] text-muted-foreground">{log.project.clientName}</div>
                              </div>
                              <button
                                onClick={() => {
                                  setVaultProjectId(log.project!.id);
                                  setVaultProjectName(log.project!.name);
                                }}
                                className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                                title="Open Credential Vault"
                              >
                                <Lock className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-5 py-3.5">
                          <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-foreground font-mono">
                            {log.ipAddress}
                          </code>
                        </td>

                        {/* Details Trigger */}
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setInspectingLog(log)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors shadow-xs cursor-pointer"
                          >
                            <Code className="h-3 w-3 text-muted-foreground" />
                            <span>Payload</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/80 bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
              <div>
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} events
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-border/80 bg-card p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-mono text-xs">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-border/80 bg-card p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer shadow-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* JSON Payload Inspector Modal */}
      {inspectingLog && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setInspectingLog(null)}>
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border/80 pb-3 mb-4">
              <div>
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <span>Audit Event Payload</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${getActionBadgeColor(inspectingLog.action)}`}>
                    {inspectingLog.action}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">ID: {inspectingLog.id}</p>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">Timestamp</span>
                  <span className="text-foreground font-mono mt-0.5 block">{new Date(inspectingLog.timestamp).toISOString()}</span>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">IP Address</span>
                  <span className="text-foreground font-mono mt-0.5 block">{inspectingLog.ipAddress}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">User Agent:</span>
                <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 text-xs text-muted-foreground font-mono break-all">
                  {inspectingLog.userAgent}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">Contextual Metadata (JSON):</span>
                <pre className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs text-emerald-800 font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-border/80 mt-4 flex justify-end">
              <button
                onClick={() => setInspectingLog(null)}
                className="rounded-xl bg-card border border-border/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Portal>
      )}

      {/* Credential Vault Modal */}
      {vaultProjectId && (
        <CredentialVaultModal
          projectId={vaultProjectId}
          projectName={vaultProjectName}
          isOpen={Boolean(vaultProjectId)}
          onClose={() => setVaultProjectId(null)}
          onSaved={() => fetchAuditLogs()}
        />
      )}
    </div>
  );
}
