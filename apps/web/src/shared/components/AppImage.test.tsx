import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ResponsiveImage } from "@/shared/lib/responsiveImage";

import { AppImage } from "./AppImage";

const withVariants: ResponsiveImage = {
  url: "https://cdn.outfiqe.test/original.jpg",
  lqip: "data:image/webp;base64,blur",
  sources: [
    { format: "avif", srcSet: "https://cdn.outfiqe.test/320.avif 320w" },
    { format: "webp", srcSet: "https://cdn.outfiqe.test/320.webp 320w" },
    { format: "jpeg", srcSet: "https://cdn.outfiqe.test/320.jpg 320w" },
  ],
};

const fallbackOnly: ResponsiveImage = {
  url: "https://cdn.outfiqe.test/original.jpg",
  lqip: "data:image/webp;base64,blur",
  sources: [],
};

describe("AppImage", () => {
  it("lazy-loads by default", () => {
    render(<AppImage src="/photo.jpg" alt="A photo" width={200} height={200} />);

    expect(screen.getByRole("img", { name: "A photo" })).toHaveAttribute("loading", "lazy");
  });

  it("loads eagerly and drops lazy loading when eager is set", () => {
    render(<AppImage src="/photo.jpg" alt="A photo" width={200} height={200} eager />);

    expect(screen.getByRole("img", { name: "A photo" })).not.toHaveAttribute("loading", "lazy");
  });

  it("covers its box when fill is used", () => {
    render(<AppImage src="/photo.jpg" alt="A photo" fill sizes="100px" />);

    expect(screen.getByRole("img", { name: "A photo" })).toHaveClass("object-cover");
  });

  describe("with a responsive image that has processed variants", () => {
    it("renders a <picture> with an avif and a webp source", () => {
      const { container } = render(
        <AppImage src={withVariants.url} image={withVariants} alt="Jacket" fill sizes="50vw" />,
      );

      const sources = [...container.querySelectorAll("source")];
      expect(sources.map((source) => source.getAttribute("type"))).toEqual([
        "image/avif",
        "image/webp",
      ]);
      expect(sources[0]).toHaveAttribute("srcset", "https://cdn.outfiqe.test/320.avif 320w");
    });

    it("points the <img> at the original url with the jpeg srcSet and the lqip backdrop", () => {
      render(
        <AppImage src={withVariants.url} image={withVariants} alt="Jacket" fill sizes="50vw" />,
      );

      const image = screen.getByRole("img", { name: "Jacket" });
      expect(image).toHaveAttribute("src", "https://cdn.outfiqe.test/original.jpg");
      expect(image).toHaveAttribute("srcset", "https://cdn.outfiqe.test/320.jpg 320w");
      expect(image).toHaveStyle({
        backgroundImage: 'url("data:image/webp;base64,blur")',
      });
      expect(image).toHaveClass("absolute", "inset-0", "object-cover");
    });

    it("marks the picture <img> as eager and high priority when eager is set", () => {
      render(<AppImage src={withVariants.url} image={withVariants} alt="Jacket" eager />);

      const image = screen.getByRole("img", { name: "Jacket" });
      expect(image).toHaveAttribute("loading", "eager");
      expect(image).toHaveAttribute("fetchpriority", "high");
    });

    it("omits the lqip backdrop and the jpeg srcSet when neither is present", () => {
      const noLqipNoJpeg: ResponsiveImage = {
        url: "https://cdn.outfiqe.test/original.jpg",
        lqip: null,
        sources: [{ format: "avif", srcSet: "https://cdn.outfiqe.test/320.avif 320w" }],
      };
      render(<AppImage src={noLqipNoJpeg.url} image={noLqipNoJpeg} alt="Jacket" />);

      const image = screen.getByRole("img", { name: "Jacket" });
      expect(image).not.toHaveAttribute("srcset");
      expect(image.style.backgroundImage).toBe("");
    });
  });

  describe("with a responsive image that has no variants yet", () => {
    it("falls back to a single next/image with no <picture> sources", () => {
      const { container } = render(
        <AppImage src="/ignored.jpg" image={fallbackOnly} alt="Jacket" fill sizes="50vw" />,
      );

      expect(container.querySelectorAll("source")).toHaveLength(0);
      expect(screen.getByRole("img", { name: "Jacket" })).toHaveAttribute("loading", "lazy");
    });
  });
});
