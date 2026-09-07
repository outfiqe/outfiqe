import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Drawer } from "./drawer";
import { stubMatchMedia } from "./testing/setup";

const originalInnerHeight = window.innerHeight;

const setInnerHeight = (value: number): void => {
  Object.defineProperty(window, "innerHeight", { value, configurable: true, writable: true });
};

const installFakeVisualViewport = (height: number) => {
  const listeners = new Set<() => void>();
  const viewport = {
    height,
    offsetTop: 0,
    addEventListener: vi.fn((_type: string, callback: () => void) => listeners.add(callback)),
    removeEventListener: vi.fn((_type: string, callback: () => void) => listeners.delete(callback)),
    resizeTo(nextHeight: number) {
      this.height = nextHeight;
      act(() => listeners.forEach((callback) => callback()));
    },
  };
  Object.defineProperty(window, "visualViewport", {
    value: viewport,
    configurable: true,
    writable: true,
  });
  return viewport;
};

afterEach(() => {
  setInnerHeight(originalInnerHeight);
  Object.defineProperty(window, "visualViewport", {
    value: undefined,
    configurable: true,
    writable: true,
  });
  stubMatchMedia(false);
});

describe("Drawer", () => {
  it("renders nothing when closed", () => {
    render(
      <Drawer open={false} onClose={vi.fn()} title="Messages">
        Body
      </Drawer>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the title, actions and children when open", () => {
    render(
      <Drawer open onClose={vi.fn()} title="Messages" actions={<button>Expand</button>}>
        Conversation list
      </Drawer>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Conversation list")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Messages">
        Body
      </Drawer>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the mobile backdrop is tapped", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Messages">
        Body
      </Drawer>,
    );

    fireEvent.click(screen.getByTestId("drawer-backdrop"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("dims the mobile backdrop with a plain scrim and no blur", () => {
    render(
      <Drawer open onClose={vi.fn()} title="Messages">
        Body
      </Drawer>,
    );

    const backdrop = screen.getByTestId("drawer-backdrop");
    expect(backdrop).toHaveClass("bg-black/55");
    expect(backdrop).not.toHaveClass("backdrop-blur-[2px]");
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Messages">
        Body
      </Drawer>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("only dismisses the topmost drawer when two are stacked", () => {
    const onCloseBack = vi.fn();
    const onCloseFront = vi.fn();
    render(
      <>
        <Drawer open onClose={onCloseBack} title="Behind">
          Behind body
        </Drawer>
        <Drawer open onClose={onCloseFront} title="On top">
          Front body
        </Drawer>
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCloseFront).toHaveBeenCalledOnce();
    expect(onCloseBack).not.toHaveBeenCalled();
  });

  it("renders the footer when provided", () => {
    render(
      <Drawer open onClose={vi.fn()} title="Messages" footer={<span>Send</span>}>
        Body
      </Drawer>,
    );

    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("gives the mobile sheet a 90dvh height with rounded top corners", () => {
    render(
      <Drawer open onClose={vi.fn()} title="Messages">
        Body
      </Drawer>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("h-[90dvh]", "rounded-t-[28px]");
  });

  describe("mobile soft keyboard", () => {
    beforeEach(() => {
      stubMatchMedia(true);
      setInnerHeight(800);
    });

    it("pins the sheet above the keyboard when the visual viewport shrinks", () => {
      installFakeVisualViewport(360);

      render(
        <Drawer open onClose={vi.fn()} title="Messages">
          Body
        </Drawer>,
      );

      expect(screen.getByRole("dialog")).toHaveStyle({ bottom: "440px", height: "360px" });
    });

    it("leaves the sheet alone while the keyboard is closed", () => {
      installFakeVisualViewport(780);

      render(
        <Drawer open onClose={vi.fn()} title="Messages">
          Body
        </Drawer>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog.style.height).toBe("");
      expect(dialog.style.bottom).toBe("");
    });

    it("reacts as the keyboard opens and closes", () => {
      const viewport = installFakeVisualViewport(780);

      render(
        <Drawer open onClose={vi.fn()} title="Messages">
          Body
        </Drawer>,
      );
      const dialog = screen.getByRole("dialog");
      expect(dialog.style.bottom).toBe("");

      viewport.resizeTo(360);
      expect(dialog).toHaveStyle({ bottom: "440px", height: "360px" });

      viewport.resizeTo(780);
      expect(dialog.style.bottom).toBe("");
    });

    it("does not touch the sheet above the sm breakpoint", () => {
      stubMatchMedia(false);
      installFakeVisualViewport(360);

      render(
        <Drawer open onClose={vi.fn()} title="Messages">
          Body
        </Drawer>,
      );

      expect(screen.getByRole("dialog").style.height).toBe("");
    });
  });
});
