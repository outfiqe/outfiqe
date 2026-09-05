"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Drawer as VaulDrawer } from "vaul";

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
  snapPoints?: (number | string)[];
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
  snapPoints,
}: DrawerProps) => {
  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) onClose();
  };

  return (
    <VaulDrawer.Root
      open={open}
      onOpenChange={handleOpenChange}
      modal={false}
      snapPoints={snapPoints}
    >
      <VaulDrawer.Portal>
        {open && (
          <div
            aria-hidden
            data-testid="drawer-backdrop"
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] sm:hidden"
          />
        )}

        <VaulDrawer.Content
          aria-label={ariaLabel}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[60] flex h-[90dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-card shadow-xl outline-none",
            "sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[560px] sm:w-[360px] sm:rounded-2xl sm:border",
            className,
          )}
        >
          <VaulDrawer.Handle className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30 sm:hidden" />

          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
            <VaulDrawer.Title className="min-w-0 truncate font-display text-base font-bold text-foreground">
              {title}
            </VaulDrawer.Title>
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

          <VaulDrawer.Description className="sr-only">
            Swipe down, tap outside, or press Escape to close.
          </VaulDrawer.Description>

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

          {footer && <div className="shrink-0 border-t border-border">{footer}</div>}
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
};
