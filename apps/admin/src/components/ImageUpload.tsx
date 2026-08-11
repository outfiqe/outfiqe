import { useRef, useState } from "react";

import { uploadsApi } from "@/lib/uploadsApi";
import { Button } from "./Button";

type ImageUploadProps = {
  value: string | null;
  onChange: (url: string) => void;
};

export const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const [url] = await uploadsApi.upload([file]);
      if (url) onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div
          className="size-14 shrink-0 rounded-lg border border-border bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${value})` }}
        />
      ) : (
        <div className="size-14 shrink-0 rounded-lg border border-dashed border-border" />
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading…" : value ? "Change image" : "Upload image"}
        </Button>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files)}
      />
    </div>
  );
};
