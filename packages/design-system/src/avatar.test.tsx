import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("shows the person's picture when there is one", () => {
    const { container } = render(<Avatar name="Sita" imageUrl="https://img.test/sita.jpg" />);

    expect(container.querySelector("img")).toHaveAttribute("src", "https://img.test/sita.jpg");
  });

  it("shows their first letter when there is no picture", () => {
    render(<Avatar name="sita" imageUrl={null} />);

    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("falls back to the letter when the picture can't load", () => {
    const { container } = render(<Avatar name="Sita" imageUrl="https://img.test/gone.jpg" />);

    const image = container.querySelector("img");
    if (image) fireEvent.error(image);

    expect(screen.getByText("S")).toBeInTheDocument();
  });
});
