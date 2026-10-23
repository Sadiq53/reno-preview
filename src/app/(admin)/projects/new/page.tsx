"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  ArrowLeft,
  KeyRound,
  Copy,
  Check,
  ShieldAlert,
  Globe,
  Building2,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckSquare,
  Square,
  ExternalLink,
  Plus,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Image as ImageIcon,
  UserCheck,
  Users,
  Code2,
  ShoppingBag,
  Smartphone,
  LayoutGrid,
  CheckCircle2,
  X,
  Compass,
  FileCode,
  ShieldCheck
} from "lucide-react";
import Portal from "@/components/layout/Portal";
import ImageDropzone from "@/components/ui/ImageDropzone";

interface DiscoveredPageOption {
  path: string;
  title: string;
  fullUrl: string;
  category?: "CORE" | "SHOP" | "BLOG" | "LEGAL" | "OTHER";
  isDefault: boolean;
  selected: boolean;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
}

const CATEGORIES = [
  { id: "WORDPRESS", label: "WordPress", desc: "Zero-Trust Companion Login", icon: Globe, color: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/10" },
  { id: "WOOCOMMERCE", label: "WooCommerce", desc: "E-Commerce & Shop Manager", icon: ShoppingBag, color: "text-purple-500", border: "border-purple-500/30", bg: "bg-purple-500/10" },
  { id: "SHOPIFY", label: "Shopify", desc: "Liquid & Storefront Theme", icon: ShoppingBag, color: "text-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/10" },
  { id: "WEBFLOW", label: "Webflow", desc: "Designer & CMS Staging", icon: LayoutGrid, color: "text-cyan-500", border: "border-cyan-500/30", bg: "bg-cyan-500/10" },
  { id: "NEXTJS", label: "Next.js", desc: "App Router / Full-Stack", icon: Code2, color: "text-slate-200", border: "border-slate-500/30", bg: "bg-slate-500/10" },
  { id: "REACT", label: "React", desc: "Single Page Web App", icon: FileCode, color: "text-sky-400", border: "border-sky-500/30", bg: "bg-sky-500/10" },
  { id: "REACT_NATIVE", label: "React Native", desc: "Cross-Platform Mobile App", icon: Smartphone, color: "text-indigo-400", border: "border-indigo-500/30", bg: "bg-indigo-500/10" },
  { id: "CUSTOM", label: "Custom Architecture", desc: "Tailored Engineering", icon: FolderKanban, color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10" },
];

const STAGES = [
  { id: "FULL_DEVELOPMENT", label: "Full Development", desc: "Building brand new architecture from scratch" },
  { id: "WORKING_ON_DEVELOPED", label: "Working on Developed", desc: "Iterating on an existing live site or codebase" },
  { id: "MAINTENANCE", label: "Maintenance & Support", desc: "Ongoing retainer and feature enhancements" },
  { id: "AUDIT_REVIEW", label: "Review & QA Audit", desc: "Inspection, responsive testing & client sign-off" },
];

export default function NewProjectPage() {
  const router = useRouter();

  // Core Form State
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("WORDPRESS");
  const [stage, setStage] = useState("FULL_DEVELOPMENT");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Client Selection & Creation State
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // New Client Modal Form State
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientInstagram, setNewClientInstagram] = useState("");
  const [newClientLinkedin, setNewClientLinkedin] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [clientModalError, setClientModalError] = useState("");

  // Page discovery states
  const [discoveredPages, setDiscoveredPages] = useState<DiscoveredPageOption[]>([]);
  const [pageCategoryFilter, setPageCategoryFilter] = useState<string>("ALL");
  const [pageSearchQuery, setPageSearchQuery] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [isPagesDropdownOpen, setIsPagesDropdownOpen] = useState(true);
  const [customPath, setCustomPath] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Secret revelation modal state
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Clients
  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        if (data.clients?.length > 0 && !selectedClientId) {
          setSelectedClientId(data.clients[0].id);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Handle Quick Client Creation
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientEmail.trim()) {
      setClientModalError("Name and email are required");
      return;
    }

    setIsCreatingClient(true);
    setClientModalError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim(),
          phone: newClientPhone.trim() || undefined,
          company: newClientCompany.trim() || undefined,
          instagram: newClientInstagram.trim() || undefined,
          linkedin: newClientLinkedin.trim() || undefined,
          address: newClientAddress.trim() || undefined,
          notes: newClientNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create client");
      }

      const created = data.client;
      setClients((prev) => [created, ...prev]);
      setSelectedClientId(created.id);
      setIsClientModalOpen(false);

      // Reset modal fields
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNewClientCompany("");
      setNewClientInstagram("");
      setNewClientLinkedin("");
      setNewClientAddress("");
      setNewClientNotes("");
    } catch (err: any) {
      setClientModalError(err.message || "An unexpected error occurred");
    } finally {
      setIsCreatingClient(false);
    }
  };

  // Fetch or re-fetch pages from website
  const handleFetchPages = async (overrideUrl?: string) => {
    const urlToScan = (overrideUrl || targetUrl).trim();
    if (!urlToScan || !/^https?:\/\//i.test(urlToScan)) {
      setScanMessage("Please enter a valid website URL starting with https:// or http://");
      return;
    }

    setIsScanning(true);
    setScanMessage("");

    try {
      const res = await fetch(`/api/projects/discover-pages?url=${encodeURIComponent(urlToScan)}`);
      const data = await res.json();

      if (res.ok && Array.isArray(data.pages)) {
        const existingSelectedMap = new Map(discoveredPages.map((p) => [p.path, p.selected]));

        const mapped: DiscoveredPageOption[] = data.pages.map((p: any) => {
          const isPriority =
            p.category === "CORE" ||
            p.category === "SHOP" ||
            p.category === "LEGAL" ||
            p.isDefault;

          return {
            path: p.path,
            title: p.title || p.path,
            fullUrl: p.fullUrl || `${urlToScan.replace(/\/+$/, "")}${p.path}`,
            category: p.category || "OTHER",
            isDefault: p.isDefault || p.path === "/",
            selected: existingSelectedMap.has(p.path)
              ? (existingSelectedMap.get(p.path) ?? isPriority)
              : isPriority,
          };
        });

        setDiscoveredPages(mapped);
        setHasScanned(true);
        setIsPagesDropdownOpen(true);
        const priorityCount = mapped.filter((p) => p.selected).length;
        setScanMessage(
          `Discovered ${mapped.length} pages (${priorityCount} core pages pre-selected).`
        );
      } else {
        setScanMessage(data.error || "Failed to scan website pages. You can still add pages manually.");
      }
    } catch {
      setScanMessage("Network timeout scanning website. Using default Home route.");
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle page selection
  const handleToggleSelectPage = (path: string) => {
    setDiscoveredPages((prev) =>
      prev.map((p) => {
        if (p.path === path) {
          if (p.isDefault) return p;
          return { ...p, selected: !p.selected };
        }
        return p;
      })
    );
  };

  // Toggle select all
  const handleSelectAll = (select: boolean) => {
    setDiscoveredPages((prev) =>
      prev.map((p) => {
        if (pageCategoryFilter !== "ALL" && p.category !== pageCategoryFilter) {
          return p;
        }
        return {
          ...p,
          selected: p.isDefault ? true : select,
        };
      })
    );
  };

  // Add custom manual route
  const handleAddCustomRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath) return;

    const normalizedPath = customPath.trim().startsWith("/") ? customPath.trim() : `/${customPath.trim()}`;
    const cleanTitle = customTitle.trim() || normalizedPath;

    if (discoveredPages.some((p) => p.path === normalizedPath)) {
      setScanMessage(`Path "${normalizedPath}" is already in the list.`);
      return;
    }

    const cleanBase = targetUrl.trim().replace(/\/+$/, "");
    const newPage: DiscoveredPageOption = {
      path: normalizedPath,
      title: cleanTitle,
      fullUrl: cleanBase ? `${cleanBase}${normalizedPath}` : normalizedPath,
      isDefault: false,
      selected: true,
    };

    setDiscoveredPages((prev) => [...prev, newPage]);
    setCustomPath("");
    setCustomTitle("");
    setShowCustomInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const selectedPages = discoveredPages
        .filter((p) => p.selected)
        .map((p) => ({
          path: p.path,
          title: p.title,
          isDefault: p.isDefault,
        }));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientId: selectedClientId || undefined,
          imageUrl: imageUrl.trim() || undefined,
          targetUrl: targetUrl.trim() || undefined,
          stage,
          category,
          startDate: startDate || undefined,
          targetDate: targetDate || undefined,
          pages: selectedPages.length > 0 ? selectedPages : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setCreatedProject(data.project);
      setGeneratedSecret(data.oneTimeSharedSecret);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecret = () => {
    if (generatedSecret) {
      navigator.clipboard.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const selectedCount = discoveredPages.filter((p) => p.selected).length;
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header Breadcrumb */}
      <div className="mb-8">
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4 group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Projects Directory</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Project Studio & Access Hub</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Create New Project
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure project identity, category stack, client linkage, timeline, and responsive preview routes.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive animate-in fade-in">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Studio Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. PROJECT ESSENTIALS */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">1. Project Identity & Banner</h2>
              <p className="text-xs text-muted-foreground">General project name and visual preview thumbnail</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Project Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Luxury Watches"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-secondary/50 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            {/* Project Banner Drag-and-Drop Image Uploader */}
            <div className="sm:col-span-2">
              <ImageDropzone
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
                folder="project-covers"
                label="Project Banner & Cover Image"
                description="Drag & drop your client website thumbnail or mockups here, stored directly in Firebase."
              />
            </div>
          </div>
        </div>

        {/* 2. CLIENT SELECTION & INLINE CREATION */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">2. Client Ownership</h2>
                <p className="text-xs text-muted-foreground">Assign to an existing client or add a new client directly</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsClientModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add New Client</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Select Client <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 pr-8 rounded-xl border border-border bg-secondary/50 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  {clients.length === 0 && <option value="">No clients found - Add one</option>}
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""} - {c.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {selectedClient && (
              <div className="p-3.5 rounded-2xl border border-border/80 bg-secondary/30 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  Selected Client Profile
                </span>
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>{selectedClient.name}</span>
                  {selectedClient.company && (
                    <span className="text-[10px] font-normal text-muted-foreground">
                      &bull; {selectedClient.company}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {selectedClient.email}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. TECH CATEGORY & PROJECT STAGE */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">3. Tech Category & Project Stage</h2>
              <p className="text-xs text-muted-foreground">Select framework, CMS or mobile stack, and the delivery phase</p>
            </div>
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              Platform & Architecture Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? `${cat.border} ${cat.bg} ring-1 ring-primary/40 shadow-xs`
                        : "border-border bg-secondary/30 hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <IconComponent className={`h-4 w-4 ${cat.color}`} />
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isSelected ? "bg-primary" : "bg-border"
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-foreground mt-1">{cat.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {cat.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              Development Stage
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STAGES.map((stg) => {
                const isSelected = stage === stg.id;
                return (
                  <div
                    key={stg.id}
                    onClick={() => setStage(stg.id)}
                    className={`flex flex-col p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                        : "border-border bg-secondary/30 hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{stg.label}</span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isSelected ? "bg-primary" : "bg-border"
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {stg.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. TIMELINE & OPTIONAL LIVE WEBSITE LINK */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">4. Timeline & Target Website Link</h2>
              <p className="text-xs text-muted-foreground">Target link is optional for brand new projects</p>
            </div>
          </div>

          {/* Timeline Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Start Date (Optional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-secondary/50 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Target Delivery / Deadline (Optional)</span>
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-secondary/50 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Target Link & Page Discovery */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
              <span>Target Website URL (Optional)</span>
              <span className="text-[10px] text-muted-foreground">Live site or staging preview</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-border bg-secondary/50 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <Globe className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>

              {targetUrl.trim() && (
                <button
                  type="button"
                  onClick={() => handleFetchPages()}
                  disabled={isScanning}
                  className="h-11 px-4 rounded-xl border border-primary/30 bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Scanning Routes...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="h-4 w-4" />
                      <span>Discover Pages</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {scanMessage && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {scanMessage}
              </p>
            )}
          </div>

          {/* Discovered Pages Accordion */}
          {discoveredPages.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Preview Pages ({selectedCount} selected)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">&bull;</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {discoveredPages.map((page) => (
                  <div
                    key={page.path}
                    onClick={() => handleToggleSelectPage(page.path)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      page.selected
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/60 bg-card/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {page.selected ? (
                        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-semibold truncate">{page.title}</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate">
                        {page.path}
                      </span>
                    </div>

                    {page.isDefault && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0">
                        Home
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/projects"
            className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Project...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Initialize Project</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* QUICK INLINE CLIENT CREATION MODAL */}
      {isClientModalOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in"
            onClick={() => setIsClientModalOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl text-foreground max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-border/80 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Add New Client</h3>
                    <p className="text-xs text-muted-foreground">Save details to project directory</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsClientModalOpen(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {clientModalError && (
                <div className="mb-4 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
                  {clientModalError}
                </div>
              )}

              <form onSubmit={handleCreateClient} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Client / Organization Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp or Sarah Miller"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="client@acme.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Instagram Handle (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="@clientbrand"
                      value={newClientInstagram}
                      onChange={(e) => setNewClientInstagram(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      LinkedIn URL (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="linkedin.com/company/..."
                      value={newClientLinkedin}
                      onChange={(e) => setNewClientLinkedin(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Client Location / Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="742 Evergreen Terrace, Springfield"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isCreatingClient || !newClientName.trim() || !newClientEmail.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingClient ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Client...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Save & Select Client</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* POST-CREATION SECRET REVELATION MODAL */}
      {createdProject && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl text-foreground">
              <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Project Initialized Successfully
                </span>
              </div>

              <h2 className="font-display text-lg font-bold text-foreground mb-1">
                {createdProject.name}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                The project workspace is active. If configuring zero-trust WordPress access, save the one-time shared secret below.
              </p>

              {generatedSecret && (
                <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4 mb-5 space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Zero-Trust One-Time Shared Secret
                  </span>
                  <div className="flex items-center justify-between gap-2 bg-card p-2.5 rounded-xl border border-border">
                    <code className="text-xs text-primary font-mono truncate select-all">
                      {generatedSecret}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <Link
                  href={`/projects/${createdProject.id}`}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
                >
                  Manage Project
                </Link>

                <Link
                  href={`/preview/${createdProject.id}`}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 cursor-pointer"
                >
                  <span>Open Interactive Preview</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
