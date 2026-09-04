import { fireEvent, render, screen } from "@testing-library/react";
import { useReducedMotion } from "framer-motion";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Drawer } from "./drawer";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

beforeEach(() => {
  vi.mocked(useReducedMotion).mockReturnValue(false);
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

  it("closes on Escape when it is the topmost dialog", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Messages">
        Body
      </Drawer>,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ignores keys other than Escape", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="Messages">
        Body
      </Drawer>,
    );

    fireEvent.keyDown(window, { key: "Enter" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the footer when provided", () => {
    render(
      <Drawer open onClose={vi.fn()} title="Messages" footer={<span>Send</span>}>
        Body
      </Drawer>,
    );

    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("ignores Escape when another dialog is stacked above it", () => {
    const onClose = vi.fn();
    render(
      <>
        <Drawer open onClose={onClose} title="Messages">
          Body
        </Drawer>
        <div role="dialog" aria-label="On top" />
      </>,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("gives the mobile sheet a 90dvh height with rounded top corners", () => {
    render(
      <Drawer open onClose={vi.fn()} title="Messages">
        Body
      </Drawer>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("h-[90dvh]", "rounded-t-[28px]");
  });

  it("still renders with reduced motion", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(
      <Drawer open onClose={vi.fn()} title="Messages">
        Body
      </Drawer>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
