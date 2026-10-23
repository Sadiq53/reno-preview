"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText,
  Link as LinkIcon,
  Sparkles,
  Eye,
  RefreshCw
} from "lucide-react";

interface ImageDropzoneProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  description?: string;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function ImageDropzone({
  value = "",
  onChange,
  folder = "project-covers",
  label = "Project Banner / Cover Image",
  description = "Drag & drop your cover thumbnail or project asset here, or click to browse.",
  className = "",
  accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf",
  maxSizeMB = 25,
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [storageProvider, setStorageProvider] = useState<"firebase" | "local" | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadFile = useCallback(
    async (file: File) => {
      setErrorMessage("");

      if (file.size > maxSizeMB * 1024 * 1024) {
        setErrorMessage(`File exceeds maximum size of ${maxSizeMB}MB.`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(15);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        setUploadProgress(45);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        setUploadProgress(85);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed with status ${res.status}`);
        }

        const data = await res.json();
        const uploadedUrl = data.file?.url;

        if (!uploadedUrl) {
          throw new Error("Server did not return a valid file URL.");
        }

        setUploadProgress(100);
        setStorageProvider(data.file?.storageProvider || "firebase");
        onChange(uploadedUrl);
      } catch (err: any) {
        console.error("[IMAGE_DROPZONE_UPLOAD_ERROR]:", err);
        setErrorMessage(err.message || "Failed to upload image. Please try again.");
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(null), 800);
      }
    },
    [folder, maxSizeMB, onChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleUploadFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleUploadFile(file);
    }
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrlInput.trim()) {
      onChange(manualUrlInput.trim());
      setShowManualUrl(false);
      setManualUrlInput("");
    }
  };

  const isPdf = value.toLowerCase().endsWith(".pdf");

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 text-primary" />
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={() => setShowManualUrl(!showManualUrl)}
          className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showManualUrl ? "Dropzone upload" : "Paste image URL"}</span>
        </button>
      </div>

      {showManualUrl ? (
        <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3.5 space-y-2.5">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/... or custom hosted URL"
              value={manualUrlInput}
              onChange={(e) => setManualUrlInput(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            <button
              type="button"
              onClick={handleManualUrlSubmit}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              Apply
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Provide a direct image URL if you prefer not to upload a local file.
          </p>
        </div>
      ) : value ? (
        /* Render Selected / Uploaded File Preview */
        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-xs space-y-3">
          <div className="relative group overflow-hidden rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-center min-h-[160px] max-h-[220px]">
            {isPdf ? (
              <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <FileText className="h-12 w-12 text-primary mb-2" />
                <span className="text-xs font-bold text-foreground">PDF Document Attached</span>
                <span className="text-[11px] font-mono break-all max-w-sm mt-1">{value}</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Project banner preview"
                className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // Fallback on broken image
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            )}

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold shadow-md hover:bg-white transition-all cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View Full</span>
              </a>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {storageProvider === "firebase" || value.includes("firebasestorage")
                  ? "Stored securely in Firebase Cloud Storage"
                  : "Asset uploaded & ready"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onChange("")}
              className="text-muted-foreground hover:text-rose-600 transition-colors font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        /* Upload Drag & Drop Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border/80 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <Sparkles className="h-4 w-4 text-accent absolute -bottom-1 -right-1 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Uploading to Firebase Storage...
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Optimizing and generating zero-trust encrypted asset link
                </p>
              </div>
              {uploadProgress !== null && (
                <div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden border border-border/60 mt-1">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
                <UploadCloud className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  {description}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground font-mono">
                <span>PNG, JPG, WEBP, SVG, PDF</span>
                <span>&bull;</span>
                <span>Max {maxSizeMB}MB</span>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

export default ImageDropzone;
