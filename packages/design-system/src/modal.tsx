"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "./cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] === dialogRef.current) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-xl sm:max-w-lg sm:rounded-2xl",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border px-6 py-5">
          <h2 id="modal-title" className="font-display text-lg font-bold text-foreground">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
