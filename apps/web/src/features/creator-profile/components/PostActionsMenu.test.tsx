import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PostActionsMenu } from "@/features/creator-profile/components/PostActionsMenu";

describe("PostActionsMenu", () => {
  it("is closed until the trigger is clicked", () => {
    render(<PostActionsMenu onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the menu when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<PostActionsMenu onEdit={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Post options" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("calls onEdit and closes the menu when Edit is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<PostActionsMenu onEdit={onEdit} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Post options" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onDelete and closes the menu when Delete is clicked", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<PostActionsMenu onEdit={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Post options" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when a click happens outside of it", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <PostActionsMenu onEdit={vi.fn()} onDelete={vi.fn()} />
        <button type="button">Outside</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Post options" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
