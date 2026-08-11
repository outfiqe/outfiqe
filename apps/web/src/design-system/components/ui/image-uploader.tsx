"use client";

import { useRef } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { useImageUpload } from "@/shared/hooks/useImageUpload";

type ImageUploaderProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  className?: string;
};

const DEFAULT_MAX_FILES = 6;

export const ImageUploader = ({
  value,
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  className,
}: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error } = useImageUpload();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, maxFiles - value.length);
    if (files.length === 0) return;

    const urls = await upload(files);
    if (urls.length > 0) onChange([...value, ...urls]);
    if (inputRef.current) inputRef.current.value = "";
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
