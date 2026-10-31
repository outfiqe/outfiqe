import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BACK_LINK_CLASS_NAME, BackLinkLabel } from "./back-link";

describe("BackLinkLabel", () => {
  it("shows an arrow beside the text, inside whatever link the app uses", () => {
    render(
      <a href="/orders" className={BACK_LINK_CLASS_NAME}>
        <BackLinkLabel>All orders</BackLinkLabel>
      </a>,
    );

    const backLink = screen.getByRole("link", { name: "All orders" });
    expect(backLink.querySelector("svg")).not.toBeNull();
    expect(backLink.className).toContain("mb-4");
  });
});
