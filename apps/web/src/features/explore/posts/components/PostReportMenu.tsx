"use client";

import { Flag, MoreVertical, Tag } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

type PostReportMenuProps = {
  onReport: () => void;
  onReportTag?: () => void;
  className?: string;
};

type ReportMenuItemProps = {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
};

const ReportMenuItem = ({ icon, label, onSelect }: ReportMenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    onClick={(event) => {
      event.stopPropagation();
      onSelect();
    }}
    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
  >
    {icon}
    {label}
  </button>
);

export const PostReportMenu = ({ onReport, onReportTag, className }: PostReportMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={menuRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-label="Drop options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1.5 w-40 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <ReportMenuItem
            icon={<Flag className="size-3.5" />}
            label="Report"
            onSelect={() => {
              setOpen(false);
              onReport();
            }}
          />
          {onReportTag && (
            <ReportMenuItem
              icon={<Tag className="size-3.5" />}
              label="Report a tag"
              onSelect={() => {
                setOpen(false);
                onReportTag();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
