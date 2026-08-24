"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "./cn";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  ariaLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const Drawer = ({
  open,
  onClose,
  title,
  ariaLabel,
  actions,
  children,
  footer,
  className,
}: DrawerProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] === dialogRef.current) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="drawer-title"
      aria-label={ariaLabel}
      className={cn(
        "fixed inset-0 z-40 flex flex-col overflow-hidden bg-card shadow-xl",
        "sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[360px] sm:rounded-2xl sm:border sm:border-border",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2
          id="drawer-title"
          className="min-w-0 truncate font-display text-base font-bold text-foreground"
        >
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto",
          "[scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]",
          "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
        )}
      >
        {children}
      </div>

      {footer && <div className="shrink-0 border-t border-border">{footer}</div>}
    </div>
  );
};
