import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { FeedTaggedProduct } from "../../feed/api/exploreFeedSchemas";
import { PostTagPill } from "./PostTagPill";

const trackEvent = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));
vi.mock("../../feed/api/exploreFeedApi", () => ({ exploreFeedApi: { recordTagClick: vi.fn() } }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    onClick,
  }: {
    href: string;
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
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
  it("shows the muse's height and the tagged size when both are known", () => {
    render(<PostTagPill lookId="look-1" tag={aTag()} creatorHeightCm={168} />);

    expect(screen.getByText("Linen Shirt")).toBeInTheDocument();
    expect(screen.getByText(`5'6" · size M`)).toBeInTheDocument();
  });

  it("shows only the size when the muse has hidden their height", () => {
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

  it("records a tap on the tagged product for the look-to-order funnel", () => {
    render(<PostTagPill lookId="look-1" tag={aTag()} creatorHeightCm={168} />);

    fireEvent.click(screen.getByRole("link"));

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_CLICK, {
      look_id: "look-1",
      product_id: "product-1",
    });
  });
});
