import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumbs } from "./Breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders nothing for an empty trail", () => {
    const { container } = render(<Breadcrumbs crumbs={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links every crumb except the last, which is the current page", () => {
    render(
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Brands", path: "/brands" },
          { name: "Kastha Studio", path: "/brand/1" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Brands" })).toHaveAttribute("href", "/brands");
    expect(screen.queryByRole("link", { name: "Kastha Studio" })).toBeNull();

    const current = screen.getByText("Kastha Studio");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("emits BreadcrumbList structured data", () => {
    render(
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
        ]}
      />,
    );
    const script = document.getElementById("breadcrumb-jsonld");
    const data = JSON.parse(script?.textContent ?? "{}");
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toHaveLength(2);
  });
});
