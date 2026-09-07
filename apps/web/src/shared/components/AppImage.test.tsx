import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppImage } from "./AppImage";

describe("AppImage", () => {
  it("lazy-loads by default", () => {
    render(<AppImage src="/photo.jpg" alt="A photo" width={200} height={200} />);

    const image = screen.getByRole("img", { name: "A photo" });
    expect(image).toHaveAttribute("loading", "lazy");
  });

  it("loads eagerly and drops lazy loading when eager is set", () => {
    render(<AppImage src="/photo.jpg" alt="A photo" width={200} height={200} eager />);

    const image = screen.getByRole("img", { name: "A photo" });
    expect(image).not.toHaveAttribute("loading", "lazy");
  });

  it("covers its box when fill is used", () => {
    render(<AppImage src="/photo.jpg" alt="A photo" fill sizes="100px" />);

    expect(screen.getByRole("img", { name: "A photo" })).toHaveClass("object-cover");
  });
});
