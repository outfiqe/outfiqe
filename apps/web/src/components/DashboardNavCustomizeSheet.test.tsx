import type { SidebarNavItem } from "@outfiqe/components";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashboardNavCustomizeSheet } from "./DashboardNavCustomizeSheet";

const navItem = (id: string, label: string): SidebarNavItem => ({ id, label, href: `/${id}` });
const allItems = [
  navItem("overview", "Overview"),
  navItem("profile", "Profile"),
  navItem("progress", "Progress"),
  navItem("badges", "Badges"),
  navItem("challenges", "Challenges"),
  navItem("security", "Security"),
];

const renderSheet = (pinnedIds: string[]) => {
  const onSave = vi.fn();
  const onReset = vi.fn();
  const onClose = vi.fn();
  render(
    <DashboardNavCustomizeSheet
      allItems={allItems}
      pinnedIds={pinnedIds}
      onSave={onSave}
      onReset={onReset}
      onClose={onClose}
    />,
  );
  return { onSave, onReset, onClose };
};

describe("DashboardNavCustomizeSheet", () => {
  it("splits the items into the bar selection and the available list", () => {
    renderSheet(["overview", "profile", "progress", "badges"]);

    expect(screen.getByText("In your bar · 4/4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Challenges" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Overview" })).not.toBeInTheDocument();
  });

  it("keeps the menu button as a locked, non-interactive row", () => {
    renderSheet(["overview", "profile", "progress", "badges"]);

    expect(screen.getByText("Menu button")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Menu button/ })).not.toBeInTheDocument();
  });

  it("disables Save until exactly four are chosen, then saves that selection", async () => {
    const { onSave } = renderSheet(["overview", "profile", "progress"]);
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Add Challenges" }));

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    await user.click(save);

    expect(onSave).toHaveBeenCalledWith(["overview", "profile", "progress", "challenges"]);
  });

  it("stops adding past four and re-enables it after a removal", async () => {
    renderSheet(["overview", "profile", "progress", "badges"]);
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Add Challenges" })).toBeDisabled();
    expect(screen.getByText("Remove one to add another.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Badges" }));

    expect(screen.getByRole("button", { name: "Add Challenges" })).toBeEnabled();
  });

  it("exposes drag handles on the pinned rows", () => {
    renderSheet(["overview", "profile", "progress", "badges"]);
    const overviewRow = screen.getByRole("button", { name: "Remove Overview" }).closest("li");
    expect(overviewRow).toHaveAttribute("draggable", "true");
    expect(
      within(overviewRow as HTMLElement).getByRole("button", { name: "Move Overview down" }),
    ).toBeInTheDocument();
  });

  it("resets to default", async () => {
    const { onReset } = renderSheet(["overview", "profile", "progress", "badges"]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Reset to default" }));
    expect(onReset).toHaveBeenCalled();
  });
});
