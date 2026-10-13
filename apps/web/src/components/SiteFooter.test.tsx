import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./SiteFooter";
import { FOOTER_ESSENTIAL_LINKS, FOOTER_LINK_GROUPS } from "./siteFooter.constants";

const ALL_GROUP_LINKS = FOOTER_LINK_GROUPS.flatMap(({ links }) => links);

describe("SiteFooter", () => {
  it("renders the creator-commission disclosure", () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/muses may earn a commission when you shop the pieces they've tagged/i),
    ).toBeInTheDocument();
  });

  it("shows the phone menu as one collapsible row per group, holding every link", () => {
    render(<SiteFooter />);

    const appMenu = screen.getByRole("navigation", { name: "More from Outfiqe" });
    const groupRows = appMenu.querySelectorAll("details > summary");
    expect([...groupRows].map((row) => row.textContent)).toEqual(
      FOOTER_LINK_GROUPS.map(({ title }) => title),
    );
    for (const { label, href } of ALL_GROUP_LINKS) {
      expect(within(appMenu).getByRole("link", { name: label, hidden: true })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("starts with every phone menu group closed", () => {
    render(<SiteFooter />);

    const appMenu = screen.getByRole("navigation", { name: "More from Outfiqe" });
    for (const group of appMenu.querySelectorAll("details")) {
      expect(group).not.toHaveAttribute("open");
    }
  });

  it("keeps a column per group for larger screens", () => {
    render(<SiteFooter />);

    for (const { title, links } of FOOTER_LINK_GROUPS) {
      const column = screen.getByRole("navigation", { name: title });
      expect(within(column).getAllByRole("link")).toHaveLength(links.length);
    }
  });

  it("keeps terms, privacy and help one tap away on phones", () => {
    render(<SiteFooter />);

    const essentials = screen.getByRole("navigation", { name: "Legal and help" });
    expect(
      within(essentials)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(FOOTER_ESSENTIAL_LINKS.map(({ label }) => label));
  });

  it("has no language switch", () => {
    render(<SiteFooter />);

    expect(screen.queryByRole("group", { name: "Language / भाषा" })).not.toBeInTheDocument();
  });
});
