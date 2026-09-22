import type { SidebarNavSection } from "@outfiqe/components";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithRouter } from "@/testing/renderWithRouter";

import { AdminModuleSearch } from "./AdminModuleSearch";

const SECTIONS: SidebarNavSection[] = [
  {
    id: "crm",
    label: "CRM",
    items: [
      { id: "crm-overview", href: "/crm", label: "Overview" },
      { id: "crm-partners", href: "/crm/partners", label: "Partners" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      {
        id: "platform-group-growth",
        href: "/creators",
        label: "Growth",
        items: [{ id: "creators", href: "/creators", label: "Creators" }],
      },
    ],
  },
];

describe("AdminModuleSearch", () => {
  it("shows nothing below the input until the query reaches the minimum length", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<AdminModuleSearch sections={SECTIONS} />);

    const input = await screen.findByLabelText("Search admin modules");
    await user.type(input, "c");

    expect(screen.queryByText("Creators")).not.toBeInTheDocument();
    expect(screen.queryByText(/No modules match/i)).not.toBeInTheDocument();
  });

  it("filters across nested groups and sections and shows each match's section", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<AdminModuleSearch sections={SECTIONS} />);

    const input = await screen.findByLabelText("Search admin modules");
    await user.type(input, "over");

    const matches = await screen.findAllByText("Overview");
    expect(matches).toHaveLength(1);
    expect(screen.getByText("CRM")).toBeInTheDocument();
  });

  it("finds an item nested inside a sidebar group", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<AdminModuleSearch sections={SECTIONS} />);

    const input = await screen.findByLabelText("Search admin modules");
    await user.type(input, "creators");

    expect(await screen.findByText("Creators")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("shows an explicit empty state when nothing matches", async () => {
    const user = userEvent.setup({ delay: null });
    renderWithRouter(<AdminModuleSearch sections={SECTIONS} />);

    const input = await screen.findByLabelText("Search admin modules");
    await user.type(input, "zzz");

    expect(await screen.findByText(/No modules match/i)).toBeInTheDocument();
  });

  it("navigates to the selected module and clears the query", async () => {
    const user = userEvent.setup({ delay: null });
    const { router } = renderWithRouter(<AdminModuleSearch sections={SECTIONS} />);

    const input = await screen.findByLabelText("Search admin modules");
    await user.type(input, "partners");
    await user.click(await screen.findByText("Partners"));

    await waitFor(() => expect(router.state.location.pathname).toBe("/crm/partners"));
    await waitFor(() => expect(input).toHaveValue(""));
  });
});
