import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicCollection } from "../api/collectionSchemas";
import { CollectionCard } from "./CollectionCard";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const COLLECTION: PublicCollection = {
  id: "col-1",
  name: "Autumn Edit",
  slug: "autumn-edit",
  description: null,
  imageUrl: null,
  image: null,
  productCount: 12,
};

describe("CollectionCard", () => {
  it("shows the number of pieces in the collection", () => {
    render(<CollectionCard collection={COLLECTION} />);

    expect(screen.getByText("12 pieces")).toBeInTheDocument();
  });

  it("uses singular wording for one piece", () => {
    render(<CollectionCard collection={{ ...COLLECTION, productCount: 1 }} />);

    expect(screen.getByText("1 piece")).toBeInTheDocument();
  });

  it("hides the piece count when the collection is empty", () => {
    render(<CollectionCard collection={{ ...COLLECTION, productCount: 0 }} />);

    expect(screen.getByText("Autumn Edit")).toBeInTheDocument();
    expect(screen.queryByText(/pieces?$/)).not.toBeInTheDocument();
  });
});
