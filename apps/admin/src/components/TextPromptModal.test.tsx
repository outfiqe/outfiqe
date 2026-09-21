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

  it("shows an inline message and sends nothing when required and empty", async () => {
    const onConfirm = vi.fn();
    render(
      <TextPromptModal
        open
        title="Reject request"
        label="Reason"
        requiredMessage="Enter a reason."
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a reason.");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows the message from a custom validator and clears it when typing", async () => {
    const onConfirm = vi.fn();
    render(
      <TextPromptModal
        open
        title="Edit budget"
        label="Total budget"
        validate={(trimmedValue) => (trimmedValue === "0" ? "Use at least 1." : null)}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Total budget"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use at least 1.");
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Total budget"), "5");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
