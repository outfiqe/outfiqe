import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TextPromptModal } from "./TextPromptModal";

describe("TextPromptModal", () => {
  it("confirms with the trimmed input value", async () => {
    const onConfirm = vi.fn();
    render(
      <TextPromptModal
        open
        title="Reject request"
        label="Reason"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Reason"), "  Out of stock  ");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith("Out of stock");
  });

  it("disables confirm when required and empty", () => {
    render(
      <TextPromptModal
        open
        title="Reject request"
        label="Reason"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("allows an empty submission when not required", async () => {
    const onConfirm = vi.fn();
    render(
      <TextPromptModal
        open
        title="Reject application"
        label="Reason (optional)"
        required={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith("");
  });

  it("resets to the default value each time it reopens", () => {
    const { rerender } = render(
      <TextPromptModal
        open
        title="Edit budget"
        label="Total budget"
        defaultValue="100"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Total budget")).toHaveValue("100");

    rerender(
      <TextPromptModal
        open={false}
        title="Edit budget"
        label="Total budget"
        defaultValue="100"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    rerender(
      <TextPromptModal
        open
        title="Edit budget"
        label="Total budget"
        defaultValue="250"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Total budget")).toHaveValue("250");
  });

  it("calls onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <TextPromptModal
        open
        title="Reject request"
        label="Reason"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
  });
});
