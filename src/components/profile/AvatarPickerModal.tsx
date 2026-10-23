"use client";

import React, { useState } from "react";
import Portal from "@/components/layout/Portal";
import { AVATAR_PRESETS, AvatarPreset } from "@/lib/avatars";
import UserAvatar from "@/components/ui/UserAvatar";
import { 
  X, 
  Check, 
  Sparkles, 
  Shuffle, 
  User, 
  Layers, 
  ShieldCheck, 
  Laptop,
  Palette
} from "lucide-react";

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  onSelectAvatar: (url: string) => Promise<void> | void;
}

export default function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userName = "Developer",
  onSelectAvatar,
}: AvatarPickerModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(
    currentAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || "Crewvia")}`
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [customSeed, setCustomSeed] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const categories = ["All", "Executive", "Developer", "Creative", "Specialist"];

  const filteredPresets = selectedCategory === "All"
    ? AVATAR_PRESETS
    : AVATAR_PRESETS.filter((p) => p.category === selectedCategory);

  const handleRandomSeed = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(randomSeed)}`;
    setSelectedUrl(newUrl);
    setCustomSeed(randomSeed);
  };

  const handleApplyCustomSeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSeed.trim()) return;
    const newUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customSeed.trim())}`;
    setSelectedUrl(newUrl);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSelectAvatar(selectedUrl);
      onClose();
    } catch (e) {
      console.error("Failed to save avatar", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200" onClick={onClose}>
        <div
          className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-1.5">
                <Sparkles className="h-3 w-3 text-accent" />
                <span>Executive & Developer Identity</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Choose Profile Avatar
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a high-definition illustrated avatar or generate a custom profile seed. Visible across all projects, comments, and headers.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Active Preview Strip */}
          <div className="my-5 p-4 rounded-2xl border border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <UserAvatar
                user={{ name: userName, avatarUrl: selectedUrl }}
                size="xl"
                withRing={true}
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Selection Preview</span>
                <div className="font-display font-bold text-base text-foreground">
                  {userName}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Instant real-time update across all admin and developer interfaces
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRandomSeed}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-xs"
              >
                <Shuffle className="h-3.5 w-3.5 text-primary" />
                <span>Surprise Me</span>
              </button>
            </div>
          </div>

          {/* Categories Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Presets Gallery Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-1 border border-border/60 rounded-2xl bg-secondary/20">
            {filteredPresets.map((preset) => {
              const isSelected = selectedUrl === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedUrl(preset.url)}
                  className={`group relative flex flex-col items-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30"
                      : "border-border/80 bg-card hover:border-primary/50 hover:bg-secondary/60"
                  }`}
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden mb-1.5 p-0.5 bg-gradient-to-tr from-primary to-accent">
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="h-full w-full rounded-full object-cover bg-secondary"
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground truncate w-full text-center">
                    {preset.name.split(" ")[0]}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[9px] shadow-xs">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Seed Input */}
          <form onSubmit={handleApplyCustomSeed} className="mt-4 flex gap-2">
            <input
              type="text"
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              placeholder="Or type custom nickname / seed..."
              className="flex-1 rounded-xl border border-input bg-background py-2 px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl border border-border/80 bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              Generate
            </button>
          </form>

          {/* Modal Actions */}
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving..." : "Use This Avatar"}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
