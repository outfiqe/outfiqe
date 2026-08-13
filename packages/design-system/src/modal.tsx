"use client";

import { useEffect, useRef, type ReactNode } from "react";

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

// Tracks how many Modals are currently open so that when one Modal is
// stacked on top of another (e.g. a crop dialog opened from inside an edit
// modal), Escape only closes the topmost one instead of every open Modal.
let openModalCount = 0;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const depthRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    openModalCount += 1;
    depthRef.current = openModalCount;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && depthRef.current === openModalCount) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      openModalCount -= 1;
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
