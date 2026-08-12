"use client";

import { useRef, useState, type ReactNode } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { cn } from "./cn";

type AvatarUploaderProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (files: File[]) => Promise<string[]>;
  fallback: ReactNode;
  className?: string;
};

export const AvatarUploader = ({
  value,
  onChange,
  onUpload,
  fallback,
  className,
}: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const [url] = await onUpload([file]);
      if (url) onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        <div className="group relative size-18 shrink-0 overflow-hidden rounded-full">
          <div
            className="flex size-full items-center justify-center bg-muted bg-cover bg-center"
            style={value ? { backgroundImage: `url(${value})` } : undefined}
          >
            {!value && fallback}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            aria-label={value ? "Change photo" : "Upload photo"}
            className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition-colors group-hover:bg-black/45 group-hover:text-white disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
          </button>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="block text-sm font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-60"
          >
            {isUploading ? "Uploading…" : value ? "Change photo" : "Upload photo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
