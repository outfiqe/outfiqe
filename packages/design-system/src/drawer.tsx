"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "./cn";
import { useSwipeToDismiss } from "./use-swipe-to-dismiss";

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

const SHEET_SPRING = { type: "spring", stiffness: 420, damping: 38 } as const;

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
  const prefersReducedMotion = useReducedMotion() === true;
  const swipeToDismiss = useSwipeToDismiss(onClose);

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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            data-testid="drawer-backdrop"
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="drawer-title"
            aria-label={ariaLabel}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[60] flex h-[90dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-card shadow-xl",
              "sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[360px] sm:rounded-2xl sm:border",
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={prefersReducedMotion ? { duration: 0 } : SHEET_SPRING}
            {...swipeToDismiss}
            drag={prefersReducedMotion ? false : swipeToDismiss.drag}
          >
            <div aria-hidden className="flex shrink-0 justify-center pb-1 pt-2.5 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>

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

            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

            {footer && <div className="shrink-0 border-t border-border">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
