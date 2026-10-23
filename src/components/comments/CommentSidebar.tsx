"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MapPin,
  Send,
  Loader2,
  Sparkles,
  Plus,
  ChevronLeft
} from "lucide-react";
import CommentCard, { CommentItem } from "./CommentCard";
import TaskProgressMeter from "@/components/dashboard/TaskProgressMeter";

export interface DraftPinData {
  posX: number;
  posY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  comments: CommentItem[];
  activePageId?: string;
  activePageTitle?: string;
  activeViewportSize?: { width: number; height: number };
  selectedCommentId: string | null;
  onSelectComment: (id: string | null, comment?: CommentItem) => void;
  onAddReply: (commentId: string, content: string) => Promise<void>;
  onUpdateStatus: (commentId: string, status: "PENDING" | "IN_PROGRESS" | "RESOLVED") => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  draftPin: DraftPinData | null;
  onSubmitDraftPin: (content: string) => Promise<void>;
  onCancelDraftPin: () => void;
  currentUserId?: string;
  currentUserRole?: string;
  clientOwnCommentIds?: string[];
  currentGuestName?: string;
}

type FilterTab = "all" | "screen" | "page" | "pending" | "resolved";

export default function CommentSidebar({
  isOpen,
  onClose,
  comments,
  activePageId,
  activePageTitle = "Current Page",
  activeViewportSize,
  selectedCommentId,
  onSelectComment,
  onAddReply,
  onUpdateStatus,
  onDeleteComment,
  draftPin,
  onSubmitDraftPin,
  onCancelDraftPin,
  currentUserId,
  currentUserRole,
  clientOwnCommentIds,
  currentGuestName,
  onOpen,
}: CommentSidebarProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);

  const draftInputRef = useRef<HTMLTextAreaElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-focus input when a draft pin is placed
  useEffect(() => {
    if (draftPin) {
      setTimeout(() => {
        draftInputRef.current?.focus();
      }, 150);
    } else {
      setDraftContent("");
    }
  }, [draftPin]);

  // Scroll to selected card when selectedCommentId changes and sidebar is open
  useEffect(() => {
    if (selectedCommentId && isOpen) {
      const timer = setTimeout(() => {
        if (cardRefs.current[selectedCommentId]) {
          cardRefs.current[selectedCommentId]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedCommentId, isOpen]);

  // Counts for tabs and progress
  const counts = useMemo(() => {
    const pageComments = comments.filter((c) => !activePageId || c.pageId === activePageId);
    const screenComments = comments.filter((c) => {
      if (!activeViewportSize) return true;
      if (c.viewportWidth !== activeViewportSize.width) return false;
      if (c.viewportHeight && c.viewportHeight !== activeViewportSize.height) return false;
      return true;
    });
    const inProgress = comments.filter((c) => c.status === "IN_PROGRESS");
    const pending = comments.filter((c) => c.status === "PENDING");
    const resolved = comments.filter((c) => c.status === "RESOLVED");

    return {
      all: comments.length,
      screen: screenComments.length,
      page: pageComments.length,
      inProgress: inProgress.length,
      pending: pending.length,
      resolved: resolved.length,
    };
  }, [comments, activePageId, activeViewportSize]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      // Screen size filter
      if (activeTab === "screen" && activeViewportSize) {
        if (c.viewportWidth !== activeViewportSize.width) return false;
        if (c.viewportHeight && c.viewportHeight !== activeViewportSize.height) return false;
      }
      // Tab filter
      if (activeTab === "page" && activePageId && c.pageId !== activePageId) {
        return false;
      }
      if (activeTab === "pending" && c.status === "RESOLVED") {
        return false;
      }
      if (activeTab === "resolved" && c.status !== "RESOLVED") {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesContent = c.content.toLowerCase().includes(query);
        const matchesAuthor =
          (c.authorUser?.name || c.guestAuthorName || "").toLowerCase().includes(query);
        const matchesPage = (c.page?.title || c.page?.path || "").toLowerCase().includes(query);
        return matchesContent || matchesAuthor || matchesPage;
      }

      return true;
    });
  }, [comments, activeTab, activePageId, activeViewportSize, searchQuery]);

  const handleDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim() || isSubmittingDraft) return;

    setIsSubmittingDraft(true);
    try {
      await onSubmitDraftPin(draftContent.trim());
      setDraftContent("");
    } finally {
      setIsSubmittingDraft(false);
    }
  };

  return (
    <>
      {/* Sleek Docked Vertical Tab Handle when closed */}
      {!isOpen && onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-30 group flex flex-col items-center gap-2 py-3.5 px-2 rounded-l-2xl border-y border-l border-border/90 bg-card/95 hover:bg-card text-foreground backdrop-blur-md shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-x-1"
          title="Open Visual Feedback & Tasks (Shortcut: C)"
          aria-label="Open visual feedback sidebar"
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-2xs">
            <MessageSquare className="h-4 w-4" />
            {comments.length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-xs">
                {comments.length}
              </span>
            )}
          </div>

          <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground [writing-mode:vertical-rl] tracking-wider uppercase font-display select-none py-1">
            Feedback
          </span>

          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-0.5" />
        </button>
      )}

      <aside
        data-comment-sidebar="true"
        className={`relative h-full flex flex-col border-l border-border bg-card/95 backdrop-blur-xl shadow-xl transition-all duration-300 ease-in-out shrink-0 z-30 select-none overflow-hidden
          ${isOpen ? "w-full sm:w-[400px] xl:w-[440px] opacity-100" : "w-0 opacity-0 border-l-0 pointer-events-none"}
        `}
        aria-label="Comments and task annotations sidebar"
      >
      <div className="w-[400px] xl:w-[440px] h-full flex flex-col min-w-0">
      {/* Top Header */}
      <div className="flex h-14 items-center justify-between border-b border-border/80 px-5 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
              Visual Feedback & Tasks
            </h2>
          </div>
          <span className="rounded-full bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-secondary-foreground font-mono">
            {comments.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          title="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="border-b border-border/80 px-4 py-3 space-y-2.5 bg-muted/10">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feedback, authors, pages..."
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Tab Pills */}
        <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted/40 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg py-1 text-[10px] font-medium transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("screen")}
            className={`rounded-lg py-1 text-[10px] font-medium transition-all truncate px-0.5 cursor-pointer ${
              activeTab === "screen"
                ? "bg-card text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={activeViewportSize ? `Current Screen: ${activeViewportSize.width}×${activeViewportSize.height}` : "Current Screen"}
          >
            Screen ({counts.screen})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("page")}
            className={`rounded-lg py-1 text-[10px] font-medium transition-all truncate px-0.5 cursor-pointer ${
              activeTab === "page"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={activePageTitle}
          >
            Page ({counts.page})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`rounded-lg py-1 text-[10px] font-medium transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-card text-amber-900 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resolved")}
            className={`rounded-lg py-1 text-[10px] font-medium transition-all cursor-pointer ${
              activeTab === "resolved"
                ? "bg-card text-emerald-900 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Done ({counts.resolved})
          </button>
        </div>

        {/* Live Project Task Progress Meter */}
        {comments.length > 0 && (
          <div className="pt-1.5 px-0.5">
            <TaskProgressMeter
              total={counts.all}
              resolved={counts.resolved}
              inProgress={counts.inProgress}
              pending={counts.pending}
              size="xs"
              showBreakdown={true}
              showLabel={true}
            />
          </div>
        )}
      </div>

      {/* Main Comment Feed Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* New Pin Draft Card Form */}
        {draftPin && (
          <div className="rounded-2xl border-2 border-dashed border-primary bg-primary/[0.04] p-4 shadow-sm animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                <span>New Pin Annotation</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <MapPin className="h-3 w-3 text-primary" />
                <span>
                  {draftPin.posX.toFixed(1)}% · {draftPin.posY.toFixed(1)}%
                </span>
              </div>
            </div>

            <form onSubmit={handleDraftSubmit} className="space-y-3">
              <textarea
                ref={draftInputRef}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="What changes or feedback do you want to request here?"
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 outline-none resize-none leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelDraftPin}
                  disabled={isSubmittingDraft}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!draftContent.trim() || isSubmittingDraft}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {isSubmittingDraft ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Drop Pin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Comment Cards List */}
        {filteredComments.length > 0 ? (
          filteredComments.map((comment, idx) => (
            <div
              key={comment.id}
              ref={(el) => {
                cardRefs.current[comment.id] = el;
              }}
            >
              <CommentCard
                comment={comment}
                index={idx + 1}
                isSelected={comment.id === selectedCommentId}
                onSelect={(id, c) => onSelectComment(id, c || comment)}
                onUpdateStatus={onUpdateStatus}
                onAddReply={onAddReply}
                onDelete={onDeleteComment}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                clientOwnCommentIds={clientOwnCommentIds}
                currentGuestName={currentGuestName}
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 border border-border/80 text-muted-foreground mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {searchQuery ? "No matching annotations" : "No annotations yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              {searchQuery
                ? "Try searching for a different keyword or clear your search."
                : "Switch to Comment Mode in the top bar (or press 'C') and click anywhere on the page to drop a pin."}
            </p>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-border/80 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
        <span>Click pin to inspect element &bull; Press </span>
        <kbd className="rounded bg-card border border-border px-1 py-0.5 font-mono text-[10px] text-foreground shadow-xs">
          C
        </kbd>
        <span> for Comment Mode &bull; </span>
        <kbd className="rounded bg-card border border-border px-1 py-0.5 font-mono text-[10px] text-foreground shadow-xs">
          B
        </kbd>
        <span> for Browse Mode</span>
      </div>
      </div>
    </aside>
    </>
  );
}
