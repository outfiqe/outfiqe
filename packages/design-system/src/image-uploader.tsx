"use client";

import { ImageIcon, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "./cn";

type ImageUploaderProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  onUpload: (files: File[]) => Promise<string[]>;
  maxFiles?: number;
  className?: string;
};

const DEFAULT_MAX_FILES = 6;

export const ImageUploader = ({
  value,
  onChange,
  onUpload,
  maxFiles = DEFAULT_MAX_FILES,
  className,
}: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, maxFiles - value.length);
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    try {
      const urls = await onUpload(files);
      if (urls.length > 0) onChange([...value, ...urls]);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (url: string) => onChange(value.filter((existing) => existing !== url));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-cover bg-center"
            style={{ backgroundImage: `url(${url})` }}
          >
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Remove image"
              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            aria-label="Add photos"
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImageIcon className="size-5" />
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <p className="text-xs text-muted-foreground">
        {value.length}/{maxFiles} photos
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
