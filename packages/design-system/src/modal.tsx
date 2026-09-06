"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { Drawer as VaulDrawer } from "vaul";

import { cn } from "./cn";
import { useMediaQuery } from "./use-media-query";

const MOBILE_SHEET_MEDIA_QUERY = "(max-width: 639.98px)";
const SHEET_DISMISS_HINT = "Swipe down, tap outside, or press Escape to close.";
const UNTITLED_DIALOG_LABEL = "Dialog";

const CLOSE_BUTTON_CLASSES =
  "absolute right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-sm transition-colors hover:bg-muted";

const SCROLL_AREA_CLASSES = cn(
  "[scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]",
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent",
);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const ModalSheet = ({
  open,
  onClose,
  title,
  ariaLabel,
  description,
  children,
  footer,
  className,
}: ModalProps) => {
  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) onClose();
  };

  return (
    <VaulDrawer.Root open={open} onOpenChange={handleOpenChange}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-50 bg-black/60" />

        <VaulDrawer.Content
          aria-label={title ? undefined : ariaLabel}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-card shadow-xl outline-none",
            className,
          )}
        >
          <VaulDrawer.Handle className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(CLOSE_BUTTON_CLASSES, "top-4")}
          >
            <X className="size-4" />
          </button>

          {title ? (
            <div className="shrink-0 border-b border-border px-4 py-3 pr-12">
              <VaulDrawer.Title className="font-display text-lg font-bold text-foreground">
                {title}
              </VaulDrawer.Title>
              {description ? (
                <VaulDrawer.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </VaulDrawer.Description>
              ) : (
                <VaulDrawer.Description className="sr-only">
                  {SHEET_DISMISS_HINT}
                </VaulDrawer.Description>
              )}
            </div>
          ) : (
            <>
              <VaulDrawer.Title className="sr-only">
                {ariaLabel ?? UNTITLED_DIALOG_LABEL}
              </VaulDrawer.Title>
              <VaulDrawer.Description className="sr-only">
                {SHEET_DISMISS_HINT}
              </VaulDrawer.Description>
            </>
          )}

          <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", SCROLL_AREA_CLASSES)}>
            {children}
          </div>

          {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
};

const ModalDialog = ({
  open,
  onClose,
  title,
  ariaLabel,
  description,
  children,
  footer,
  className,
}: ModalProps) => {
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-label={title ? undefined : ariaLabel}
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-xl sm:max-w-lg sm:rounded-2xl",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(CLOSE_BUTTON_CLASSES, "top-3")}
        >
          <X className="size-4" />
        </button>

        {title && (
          <div className="shrink-0 border-b border-border px-4 py-3 pr-12 sm:px-6 sm:py-5 sm:pr-14">
            <h2 id="modal-title" className="font-display text-lg font-bold text-foreground">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto px-6 py-5", SCROLL_AREA_CLASSES)}>
          {children}
        </div>

        {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
};

export const Modal = (props: ModalProps) => {
  const rendersAsSheet = useMediaQuery(MOBILE_SHEET_MEDIA_QUERY);

  return rendersAsSheet ? <ModalSheet {...props} /> : <ModalDialog {...props} />;
};
