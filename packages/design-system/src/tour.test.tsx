import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Tour, type TourCloseReason, type TourStep } from "./tour";

const ANCHOR_RECT = { top: 100, left: 40, bottom: 140, right: 240, width: 200, height: 40 };

const TOUR_STEPS: TourStep[] = [
  { id: "welcome", title: "Welcome", body: "Let's take a look around." },
  {
    id: "products",
    title: "Products",
    body: "Add and manage products.",
    anchorSelector: "#anchor",
  },
  { id: "wallet", title: "Wallet", body: "See what you earn." },
];

type HarnessProps = {
  onClose?: (reason: TourCloseReason) => void;
  initialStepIndex?: number;
  steps?: TourStep[];
};

const TourHarness = ({
  onClose = () => {},
  initialStepIndex = 0,
  steps = TOUR_STEPS,
}: HarnessProps) => {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  return (
    <Tour
      steps={steps}
      isOpen
      stepIndex={stepIndex}
      onStepChange={setStepIndex}
      onClose={onClose}
    />
  );
};

const DEFAULT_VIEWPORT = { innerWidth: 1024, innerHeight: 768 };

const mockAnchorLayout = (anchorRect: typeof ANCHOR_RECT) =>
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return this.id === "anchor"
      ? ({ ...anchorRect, x: anchorRect.left, y: anchorRect.top, toJSON: () => ({}) } as DOMRect)
      : new DOMRect(0, 0, 0, 0);
  });

afterEach(() => {
  vi.restoreAllMocks();
  document.getElementById("anchor")?.remove();
  Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  Object.assign(window, DEFAULT_VIEWPORT);
});

describe("Tour", () => {
  it("renders nothing while closed", () => {
    render(
      <Tour
        steps={TOUR_STEPS}
        isOpen={false}
        stepIndex={0}
        onStepChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing when the step index has no step", () => {
    render(
      <Tour
        steps={TOUR_STEPS}
        isOpen
        stepIndex={TOUR_STEPS.length}
        onStepChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the first step with its counter, no Back button, and a Next button", () => {
    render(<TourHarness />);

    const dialog = screen.getByRole("dialog", { name: "Welcome" });
    expect(dialog).toHaveAccessibleDescription("Let's take a look around.");
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("moves forward with Next and back with Back", () => {
    render(<TourHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "Welcome" })).toBeInTheDocument();
  });

  it("labels the last step's button Finish and reports completed", () => {
    const onClose = vi.fn();
    render(<TourHarness initialStepIndex={2} onClose={onClose} />);

    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));

    expect(onClose).toHaveBeenCalledExactlyOnceWith("completed");
  });

  it("reports dismissed from the skip button", () => {
    const onClose = vi.fn();
    render(<TourHarness onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

    expect(onClose).toHaveBeenCalledExactlyOnceWith("dismissed");
  });

  it("does nothing when the dimmed backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<TourHarness onClose={onClose} />);

    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("supports Escape and the arrow keys", () => {
    const onClose = vi.fn();
    render(<TourHarness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByRole("dialog", { name: "Products" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByRole("dialog", { name: "Welcome" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByRole("dialog", { name: "Welcome" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledExactlyOnceWith("dismissed");
  });

  it("ignores keys it does not use", () => {
    const onClose = vi.fn();
    render(<TourHarness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "a" });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Welcome" })).toBeInTheDocument();
  });

  it("moves focus to the card on every step", () => {
    render(<TourHarness />);
    expect(screen.getByRole("dialog")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("keeps Tab focus inside the card", () => {
    render(<TourHarness initialStepIndex={1} />);
    const dialog = screen.getByRole("dialog");
    const skipButton = screen.getByRole("button", { name: "Skip tour" });
    const nextButton = screen.getByRole("button", { name: "Next" });

    nextButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(skipButton).toHaveFocus();

    skipButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(nextButton).toHaveFocus();
  });

  it("leaves Tab alone when focus is on a control in the middle of the card", () => {
    render(<TourHarness initialStepIndex={1} />);
    const backButton = screen.getByRole("button", { name: "Back" });
    backButton.focus();

    const wasNotPrevented = fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });

    expect(wasNotPrevented).toBe(true);
    expect(backButton).toHaveFocus();
  });

  it("wraps Shift+Tab from the card itself to the last control", () => {
    render(<TourHarness />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });

    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  });

  it("ignores non-Tab keys pressed inside the card", () => {
    render(<TourHarness />);
    const dialog = screen.getByRole("dialog");

    const wasNotPrevented = fireEvent.keyDown(dialog, { key: "Enter" });

    expect(wasNotPrevented).toBe(true);
    expect(dialog).toHaveFocus();
  });

  it("returns focus to the element that had it before the tour opened", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const { rerender } = render(
      <Tour steps={TOUR_STEPS} isOpen stepIndex={0} onStepChange={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("dialog")).toHaveFocus();

    rerender(
      <Tour
        steps={TOUR_STEPS}
        isOpen={false}
        stepIndex={0}
        onStepChange={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(opener).toHaveFocus();
  });

  it("centers the card with a plain backdrop when a step has no anchor", () => {
    render(<TourHarness />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.style.top).toBe("50%");
    expect(dialog.style.left).toBe("50%");
    expect(dialog.parentElement?.querySelector(".ring-2")).toBeNull();
  });

  it("centers the card when the anchor is not on the page", () => {
    render(<TourHarness initialStepIndex={1} />);

    expect(screen.getByRole("dialog").style.top).toBe("50%");
  });

  it("centers the card when the anchor exists but has no size", () => {
    document.body.insertAdjacentHTML("beforeend", '<div id="anchor"></div>');
    render(<TourHarness initialStepIndex={1} />);

    expect(screen.getByRole("dialog").style.top).toBe("50%");
  });

  describe("with a visible anchor", () => {
    const renderWithAnchor = (
      viewport: { width: number; height: number },
      anchorRect: typeof ANCHOR_RECT = ANCHOR_RECT,
    ) => {
      Object.assign(window, { innerWidth: viewport.width, innerHeight: viewport.height });
      document.body.insertAdjacentHTML("beforeend", '<div id="anchor"></div>');
      mockAnchorLayout(anchorRect);
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      render(<TourHarness initialStepIndex={1} />);
      return { scrollIntoView };
    };

    it("highlights the anchor with padding", () => {
      renderWithAnchor({ width: 1200, height: 800 });

      const spotlight = screen
        .getByRole("dialog")
        .parentElement?.querySelector<HTMLElement>(".ring-2");
      expect(spotlight).toHaveStyle({ top: "92px", left: "32px", width: "216px", height: "56px" });
    });

    it("leaves the page where it is when the anchor is already fully on screen", () => {
      const { scrollIntoView } = renderWithAnchor({ width: 1200, height: 800 });

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it.each([
      { edge: "below the fold", rect: { ...ANCHOR_RECT, top: 900, bottom: 940 } },
      { edge: "above the top", rect: { ...ANCHOR_RECT, top: -60, bottom: -20 } },
      { edge: "cut off on the left", rect: { ...ANCHOR_RECT, left: -50, right: 150 } },
      { edge: "cut off on the right", rect: { ...ANCHOR_RECT, left: 1100, right: 1300 } },
    ])("scrolls the anchor to the middle when it is $edge", ({ rect }) => {
      const { scrollIntoView } = renderWithAnchor({ width: 1200, height: 800 }, rect);

      expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: "center" });
    });

    it("places the card below the anchor when there is room", () => {
      renderWithAnchor({ width: 1200, height: 800 });

      const dialog = screen.getByRole("dialog");
      expect(dialog.style.top).toBe("160px");
      expect(dialog.style.left).toBe("40px");
    });

    it("places the card above the anchor when there is no room below", () => {
      renderWithAnchor({ width: 1200, height: 600 }, { ...ANCHOR_RECT, top: 400, bottom: 440 });

      const dialog = screen.getByRole("dialog");
      expect(dialog.style.bottom).toBe("220px");
      expect(dialog.style.top).toBe("");
    });

    it("centers the card when there is no room above or below", () => {
      renderWithAnchor({ width: 1200, height: 260 });

      expect(screen.getByRole("dialog").style.top).toBe("50%");
    });

    it("keeps the card inside a narrow viewport", () => {
      renderWithAnchor({ width: 300, height: 800 });

      const dialog = screen.getByRole("dialog");
      expect(dialog.style.width).toBe("268px");
      expect(dialog.style.left).toBe("16px");
    });

    it("re-measures the anchor when the window is resized", () => {
      renderWithAnchor({ width: 1200, height: 800 });
      const spotlight = () =>
        screen.getByRole("dialog").parentElement?.querySelector<HTMLElement>(".ring-2");
      expect(spotlight()).toHaveStyle({ top: "92px" });

      vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
        () => ({ ...ANCHOR_RECT, top: 300, bottom: 340, toJSON: () => ({}) }) as DOMRect,
      );
      fireEvent(window, new Event("resize"));

      expect(spotlight()).toHaveStyle({ top: "292px" });
    });
  });

  describe("loading state", () => {
    it("shows a centered dialog with no real step content while isLoading is true", () => {
      render(
        <Tour steps={[]} isOpen isLoading stepIndex={0} onStepChange={vi.fn()} onClose={vi.fn()} />,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog.style.top).toBe("50%");
      expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Finish" })).not.toBeInTheDocument();
    });

    it("still lets Skip close the tour while loading", () => {
      const onClose = vi.fn();
      render(
        <Tour steps={[]} isOpen isLoading stepIndex={0} onStepChange={vi.fn()} onClose={onClose} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));

      expect(onClose).toHaveBeenCalledWith("dismissed");
    });

    it("still closes on Escape while loading, but ignores arrow keys", () => {
      const onClose = vi.fn();
      const onStepChange = vi.fn();
      render(
        <Tour
          steps={[]}
          isOpen
          isLoading
          stepIndex={0}
          onStepChange={onStepChange}
          onClose={onClose}
        />,
      );

      fireEvent.keyDown(document, { key: "ArrowRight" });
      expect(onStepChange).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onClose).toHaveBeenCalledWith("dismissed");
    });

    it("renders nothing when isLoading is true but isOpen is false", () => {
      render(
        <Tour
          steps={[]}
          isOpen={false}
          isLoading
          stepIndex={0}
          onStepChange={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows the real step once isLoading turns false", () => {
      const { rerender } = render(
        <Tour steps={[]} isOpen isLoading stepIndex={0} onStepChange={vi.fn()} onClose={vi.fn()} />,
      );

      expect(screen.queryByText("Welcome")).not.toBeInTheDocument();

      rerender(
        <Tour
          steps={TOUR_STEPS}
          isOpen
          isLoading={false}
          stepIndex={0}
          onStepChange={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Welcome")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    });
  });
});
