"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Flame,
  AlertCircle,
  FileText,
  User,
  Calendar,
  StickyNote,
  Loader2,
  CheckCircle2,
  Tag
} from "lucide-react";
import Portal from "@/components/layout/Portal";

export interface PageOption {
  id: string;
  path: string;
  title?: string;
}

export interface AssigneeOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  pages?: PageOption[];
  assignees?: AssigneeOption[];
  onTaskCreated: (newTask: any) => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  pages = [],
  assignees = [],
  onTaskCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [pageId, setPageId] = useState<string>("");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Please enter a task title.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || title.trim(),
          priority,
          pageId: pageId || null,
          assigneeUserId: assigneeUserId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      onTaskCreated(data);
      // Reset form
      setTitle("");
      setContent("");
      setPriority("MEDIUM");
      setPageId("");
      setAssigneeUserId("");
      setDueDate("");
      setNotes("");
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating the task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Create New Project Task
              </h3>
              <p className="text-xs text-muted-foreground">
                Add an actionable task directly to <span className="font-semibold text-foreground">{projectName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Update hero font size and responsive padding"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            />
          </div>

          {/* Task Description / Instructions */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Task Details / Feedback Instructions
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide exact details, styling expectations, or steps for the developer..."
              className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs leading-relaxed"
            />
          </div>

          {/* Priority Selection Pills */}
          <div>
            <label className="block font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span>Priority Level</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-700 border-slate-300" },
                { value: "MEDIUM", label: "Medium", color: "bg-sky-50 text-sky-800 border-sky-300" },
                { value: "HIGH", label: "High", color: "bg-amber-50 text-amber-800 border-amber-300" },
                { value: "URGENT", label: "Urgent", color: "bg-rose-50 text-rose-800 border-rose-300", icon: <Flame className="h-3 w-3 text-rose-600 animate-pulse" /> },
              ].map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isSelected
                        ? `${p.color} ring-2 ring-primary shadow-xs font-extrabold`
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Page & Assignee Developer (Two Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Target Page */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Target Page / Route</span>
              </label>
              <select
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer font-mono"
              >
                <option value="">Site-wide (General)</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.path} {p.title ? `(${p.title})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Developer */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Assign Developer</span>
              </label>
              <select
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
              >
                <option value="">Unassigned (Open for team)</option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role ? `(${u.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & Developer Tech Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Due Date */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Due Date (Optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>

            {/* Technical Notes */}
            <div>
              <label className="block font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5 text-emerald-600" />
                <span>Internal Tech Note (Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Check CSS flexbox wrap rule"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold px-5 py-2 text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Task...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Task to Board</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
