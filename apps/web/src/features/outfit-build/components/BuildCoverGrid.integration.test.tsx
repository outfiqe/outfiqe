import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BuildCoverGrid } from "./BuildCoverGrid";

const coverPhoto = (id: string) => ({
  id,
  image: { url: `https://cdn.outfiqe.test/${id}.jpg`, lqip: null, sources: [] },
});

const renderGrid = (props: Partial<Parameters<typeof BuildCoverGrid>[0]> = {}) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <BuildCoverGrid
      coverPhotos={[]}
      previewImageUrls={[]}
      itemCount={0}
      emptyLabel="Nothing here yet"
      sizes="50vw"
      {...props}
    />,
    { wrapper: Wrapper },
  );
};

describe("BuildCoverGrid", () => {
  it("shows the cover photos instead of product shots when the owner picked some", () => {
    renderGrid({
      coverPhotos: [coverPhoto("cover-1"), coverPhoto("cover-2")],
      previewImageUrls: ["https://cdn.outfiqe.test/shirt.jpg"],
      itemCount: 6,
    });

    expect(screen.getAllByRole("img", { name: "Build cover photo" })).toHaveLength(2);
    expect(screen.queryByText("+5 items")).not.toBeInTheDocument();
  });

  it("falls back to the first three items with a count of the rest", () => {
    const { container } = renderGrid({
      previewImageUrls: [
        "https://cdn.outfiqe.test/shirt.jpg",
        "https://cdn.outfiqe.test/trousers.jpg",
        "https://cdn.outfiqe.test/shoes.jpg",
      ],
      itemCount: 5,
    });

    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByText("+2 items")).toBeInTheDocument();
  });

  it("says so when there is nothing to show", () => {
    renderGrid();

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });
});
