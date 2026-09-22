import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { FeedTaggedProduct } from "../api/exploreFeedSchemas";
import { PostTagPill } from "./PostTagPill";

vi.mock("../api/exploreFeedApi", () => ({ exploreFeedApi: { recordTagClick: vi.fn() } }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const aTag = (overrides: Partial<FeedTaggedProduct> = {}): FeedTaggedProduct => ({
  id: "product-1",
  name: "Linen Shirt",
  brand: "Aamo",
  price: 2800,
  imageUrl: null,
  sizeWorn: "M",
  ...overrides,
});

describe("PostTagPill", () => {
  it("shows the creator's height and the tagged size when both are known", () => {
    render(<PostTagPill lookId="look-1" tag={aTag()} creatorHeightCm={168} />);

    expect(screen.getByText("Linen Shirt")).toBeInTheDocument();
    expect(screen.getByText(`5'6" · size M`)).toBeInTheDocument();
  });

  it("shows only the size when the creator has hidden their height", () => {
    render(<PostTagPill lookId="look-1" tag={aTag()} creatorHeightCm={null} />);

    expect(screen.getByText("size M")).toBeInTheDocument();
  });

  it("shows only the height when the tag predates the required-size rule", () => {
    render(<PostTagPill lookId="look-1" tag={aTag({ sizeWorn: null })} creatorHeightCm={168} />);

    expect(screen.getByText(`5'6"`)).toBeInTheDocument();
  });

  it("falls back to a name-only pill when neither height nor size is known", () => {
    render(<PostTagPill lookId="look-1" tag={aTag({ sizeWorn: null })} creatorHeightCm={null} />);

    expect(screen.getByText("Linen Shirt")).toBeInTheDocument();
    expect(screen.queryByText(/size/)).not.toBeInTheDocument();
  });

  it("links to the tagged product", () => {
    render(<PostTagPill lookId="look-1" tag={aTag()} creatorHeightCm={168} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/product/product-1");
  });
});
