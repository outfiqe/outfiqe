import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Drawer } from "./drawer";

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
});
