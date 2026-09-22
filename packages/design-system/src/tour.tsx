"use client";

import { X } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "./button";
import { cn } from "./cn";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  anchorSelector?: string;
};

export type TourCloseReason = "completed" | "dismissed";

export type TourProps = {
  steps: readonly TourStep[];
  isOpen: boolean;
  stepIndex: number;
  onStepChange: (nextStepIndex: number) => void;
  onClose: (reason: TourCloseReason) => void;
};

const FIRST_STEP_INDEX = 0;
const ONE_STEP = 1;
const HUMAN_STEP_OFFSET = 1;
const SPOTLIGHT_PADDING_PX = 8;
const VIEWPORT_MARGIN_PX = 16;
const CARD_GAP_PX = 12;
const CARD_MAX_WIDTH_PX = 360;
const CARD_MIN_ROOM_PX = 240;
const FOCUSABLE_SELECTOR = "button:not([disabled])";

const findVisibleAnchor = (anchorSelector?: string): Element | null => {
  if (!anchorSelector) return null;
  const candidates = Array.from(document.querySelectorAll(anchorSelector));
  return (
    candidates.find((candidate) => {
      const { width, height } = candidate.getBoundingClientRect();
      return width > 0 && height > 0;
    }) ?? null
  );
};

const isFullyInViewport = ({ top, left, bottom, right }: DOMRect): boolean =>
  top >= 0 && left >= 0 && bottom <= window.innerHeight && right <= window.innerWidth;

const useAnchorRect = (anchorSelector: string | undefined, isActive: boolean): DOMRect | null => {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive) return undefined;

    const refreshAnchorRect = () => {
      setAnchorRect(findVisibleAnchor(anchorSelector)?.getBoundingClientRect() ?? null);
    };

    const anchor = findVisibleAnchor(anchorSelector);
    if (anchor && !isFullyInViewport(anchor.getBoundingClientRect())) {
      anchor.scrollIntoView?.({ block: "center" });
    }
    refreshAnchorRect();
    window.addEventListener("resize", refreshAnchorRect);
    window.addEventListener("scroll", refreshAnchorRect, true);
    return () => {
      window.removeEventListener("resize", refreshAnchorRect);
      window.removeEventListener("scroll", refreshAnchorRect, true);
    };
  }, [anchorSelector, isActive]);

  return isActive ? anchorRect : null;
};

const CENTERED_CARD_STYLE: CSSProperties = {
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};

const buildCardStyle = (anchorRect: DOMRect | null): CSSProperties => {
  const cardWidth = Math.min(CARD_MAX_WIDTH_PX, window.innerWidth - VIEWPORT_MARGIN_PX * 2);
  const centeredStyle = { ...CENTERED_CARD_STYLE, width: cardWidth };
  if (!anchorRect) return centeredStyle;

  const left = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(anchorRect.left, window.innerWidth - cardWidth - VIEWPORT_MARGIN_PX),
  );
  const clearance = SPOTLIGHT_PADDING_PX + CARD_GAP_PX;
  const roomBelow = window.innerHeight - anchorRect.bottom - clearance;
  const roomAbove = anchorRect.top - clearance;

  if (roomBelow >= CARD_MIN_ROOM_PX) {
    return { width: cardWidth, left, top: anchorRect.bottom + clearance };
  }
  if (roomAbove >= CARD_MIN_ROOM_PX) {
    return { width: cardWidth, left, bottom: window.innerHeight - anchorRect.top + clearance };
  }
  return centeredStyle;
};

const subscribeToNothing = () => () => {};

const useIsClient = (): boolean =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

const isTourKeyEvent = (event: KeyboardEvent): boolean =>
  event.key === "Escape" || event.key === "ArrowRight" || event.key === "ArrowLeft";

export const Tour = ({ steps, isOpen, stepIndex, onStepChange, onClose }: TourProps) => {
  const isClient = useIsClient();
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const step = steps[stepIndex];
  const isShowing = isClient && isOpen && step !== undefined;
  const anchorRect = useAnchorRect(step?.anchorSelector, isShowing);
  const isFirstStep = stepIndex === FIRST_STEP_INDEX;
  const isLastStep = stepIndex === steps.length - ONE_STEP;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isShowing) cardRef.current?.focus();
  }, [isShowing, stepIndex]);

  const goToNextStep = () => {
    if (isLastStep) {
      onClose("completed");
      return;
    }
    onStepChange(stepIndex + ONE_STEP);
  };

  const goToPreviousStep = () => {
    if (!isFirstStep) onStepChange(stepIndex - ONE_STEP);
  };

  const skipTour = () => onClose("dismissed");

  useEffect(() => {
    if (!isShowing) return undefined;

    const handleTourKey = (event: KeyboardEvent) => {
      if (!isTourKeyEvent(event)) return;
      event.preventDefault();
      if (event.key === "Escape") skipTour();
      else if (event.key === "ArrowRight") goToNextStep();
      else goToPreviousStep();
    };

    document.addEventListener("keydown", handleTourKey);
    return () => document.removeEventListener("keydown", handleTourKey);
  });

  const keepFocusInsideCard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusableControls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    const firstControl = focusableControls[FIRST_STEP_INDEX];
    const lastControl = focusableControls[focusableControls.length - ONE_STEP];
    if (!firstControl || !lastControl) return;

    const isLeavingBackwards = event.shiftKey && document.activeElement === firstControl;
    const isLeavingForwards = !event.shiftKey && document.activeElement === lastControl;
    const isFocusOnCardItself = document.activeElement === event.currentTarget;
    if (isLeavingBackwards || (event.shiftKey && isFocusOnCardItself)) {
      event.preventDefault();
      lastControl.focus();
    } else if (isLeavingForwards) {
      event.preventDefault();
      firstControl.focus();
    }
  };

  if (!isShowing) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {anchorRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ring-2 ring-primary motion-safe:transition-all motion-safe:duration-200"
          style={{
            top: anchorRect.top - SPOTLIGHT_PADDING_PX,
            left: anchorRect.left - SPOTLIGHT_PADDING_PX,
            width: anchorRect.width + SPOTLIGHT_PADDING_PX * 2,
            height: anchorRect.height + SPOTLIGHT_PADDING_PX * 2,
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        onKeyDown={keepFocusInsideCard}
        className={cn(
          "fixed rounded-2xl border border-border bg-card p-5 shadow-xl outline-none",
          "focus-visible:outline-2 focus-visible:outline-ring",
        )}
        style={buildCardStyle(anchorRect)}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {stepIndex + HUMAN_STEP_OFFSET} of {steps.length}
          </p>
          <button
            type="button"
            onClick={skipTour}
            aria-label="Skip tour"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h2 id={titleId} className="mt-2 text-base font-semibold text-foreground">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          {!isFirstStep && (
            <Button type="button" variant="outline" size="sm" onClick={goToPreviousStep}>
              Back
            </Button>
          )}
          <Button type="button" size="sm" onClick={goToNextStep}>
            {isLastStep ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
