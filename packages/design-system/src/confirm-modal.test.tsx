import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmModal } from "./confirm-modal";

describe("ConfirmModal", () => {
  it("shows the warning text and its own cancel label", () => {
    render(
      <ConfirmModal
        open
        title="Leave this build?"
        cancelLabel="Stay"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        <p>{"You'll leave its group chat."}</p>
      </ConfirmModal>,
    );

    expect(screen.getByText("You'll leave its group chat.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stay" })).toBeInTheDocument();
  });

  it("calls onConfirm and onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        open
        title="Delete zone"
        description='Delete the "Kathmandu" zone?'
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Delete the "Kathmandu" zone?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows the pending label and disables both buttons while pending", () => {
    render(
      <ConfirmModal
        open
        title="Revoke exemption"
        isPending
        pendingLabel="Revoking…"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Revoking…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
