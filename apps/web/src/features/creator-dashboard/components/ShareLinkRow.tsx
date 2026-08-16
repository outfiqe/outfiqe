"use client";

import { Button, toast } from "@outfiqe/design-system";
import { Copy } from "lucide-react";

const copyToClipboard = async (url: string) => {
  await navigator.clipboard.writeText(url);
  toast.success("Link copied");
};

type ShareLinkRowProps = {
  label: string;
  url: string;
  meta?: string;
};

export const ShareLinkRow = ({ label, url, meta }: ShareLinkRowProps) => {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{url}</p>
        {meta && <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>}
      </div>
      <Button size="sm" variant="outline" onClick={() => void copyToClipboard(url)}>
        <Copy className="size-3.5" />
        Copy
      </Button>
    </div>
  );
};
