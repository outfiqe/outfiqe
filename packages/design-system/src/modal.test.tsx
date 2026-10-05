import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Modal } from "./modal";
import { stubMatchMedia } from "./testing/setup";

const renderAtMobileWidth = (): void => stubMatchMedia(true);
const renderAtDesktopWidth = (): void => stubMatchMedia(false);

describe("Modal", () => {
  beforeEach(() => {
    renderAtDesktopWidth();
  });

  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Edit product">
        Body
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("on desktop", () => {
    it("renders as a centred dialog with the title, children and footer", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product" footer={<span>Save</span>}>
          Product form
        </Modal>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("sm:max-w-lg", "sm:rounded-2xl");
      expect(screen.getByText("Edit product")).toBeInTheDocument();
      expect(screen.getByText("Product form")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
    });

    it("renders the description under the title", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product" description="Update the listing">
          Body
        </Modal>,
      );

      expect(screen.getByText("Update the listing")).toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Edit product">
          Body
        </Modal>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("closes on Escape", () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Edit product">
          Body
        </Modal>,
      );

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not render a drag handle", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product">
          Body
        </Modal>,
      );

      expect(screen.getByRole("dialog")).not.toHaveClass("rounded-t-[28px]");
    });

    it("dims with a plain scrim and no backdrop blur", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product">
          Body
        </Modal>,
      );

      expect(screen.getByRole("dialog").parentElement).toHaveClass("bg-black/60");
      expect(screen.getByRole("dialog").parentElement).not.toHaveClass("backdrop-blur-sm");
      expect(screen.getByRole("button", { name: "Close" })).not.toHaveClass("backdrop-blur-sm");
    });

    it("covers the whole page even when opened inside a small clipped panel", () => {
      const { container } = render(
        <div className="relative h-40 overflow-hidden">
          <Modal open onClose={vi.fn()} title="Group info">
            Members
          </Modal>
        </div>,
      );

      const scrim = screen.getByRole("dialog").parentElement;
      expect(scrim?.parentElement).toBe(document.body);
      expect(container).not.toContainElement(screen.getByRole("dialog"));
    });

    it("scrolls its body when the content is taller than the screen", () => {
      render(
        <Modal open onClose={vi.fn()} title="Group info">
          Members
        </Modal>,
      );

      expect(screen.getByText("Members")).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    });
  });

  describe("on mobile", () => {
    beforeEach(() => {
      renderAtMobileWidth();
    });

    it("renders as a bottom sheet with rounded top corners", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product">
          Body
        </Modal>,
      );

      expect(screen.getByRole("dialog")).toHaveClass("rounded-t-[28px]", "max-h-[90dvh]");
    });

    it("keeps the close control free of a backdrop blur", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product">
          Body
        </Modal>,
      );

      expect(screen.getByRole("button", { name: "Close" })).not.toHaveClass("backdrop-blur-sm");
    });

    it("renders the title, children and footer", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product" footer={<span>Save</span>}>
          Product form
        </Modal>,
      );

      expect(screen.getByText("Edit product")).toBeInTheDocument();
      expect(screen.getByText("Product form")).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
    });

    it("renders the description under the title", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product" description="Update the listing">
          Body
        </Modal>,
      );

      expect(screen.getByText("Update the listing")).toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} title="Edit product">
          Body
        </Modal>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(onClose).toHaveBeenCalledOnce();
    });

    it("keeps an accessible name when no title is given", () => {
      render(
        <Modal open onClose={vi.fn()} ariaLabel="Post details">
          Body
        </Modal>,
      );

      expect(screen.getByRole("dialog", { name: "Post details" })).toBeInTheDocument();
    });

    it("lets a caller override the sheet height and corners", () => {
      render(
        <Modal open onClose={vi.fn()} title="Edit product" className="h-dvh rounded-none">
          Body
        </Modal>,
      );

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveClass("h-dvh", "rounded-none");
      expect(dialog).not.toHaveClass("rounded-t-[28px]");
    });
  });
});
