import { describe, expect, it } from "vitest";

import {
  brandStoreSchema,
  breadcrumbSchema,
  collectionPageSchema,
  faqPageSchema,
  itemListSchema,
  organizationSchema,
  productSchema,
  profilePageSchema,
  websiteSchema,
} from "./jsonLd";

describe("organizationSchema", () => {
  it("is a valid Organization node with an absolute logo url", () => {
    const node = organizationSchema();
    expect(node["@type"]).toBe("Organization");
    expect(node.name).toBe("Outfiqe");
    expect(String(node.logo)).toMatch(/^https?:\/\//);
  });

  it("omits contactPoint and sameAs when no contact details are configured", () => {
    const node = organizationSchema();
    expect(node).not.toHaveProperty("contactPoint");
    expect(node).not.toHaveProperty("sameAs");
  });
});

describe("websiteSchema", () => {
  it("declares a SearchAction pointing at the shop query", () => {
    const node = websiteSchema();
    const action = node.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    expect(String((action.target as Record<string, unknown>).urlTemplate)).toContain(
      "/shop?q={search_term_string}",
    );
  });
});

describe("breadcrumbSchema", () => {
  it("numbers items from 1 and resolves each path to an absolute url", () => {
    const node = breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Shop", path: "/shop" },
    ]);
    const items = node.itemListElement as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0]?.position).toBe(1);
    expect(String(items[1]?.item)).toMatch(/\/shop$/);
  });
});

describe("productSchema", () => {
  const base = {
    name: "Everyday Crewneck",
    description: "A crewneck",
    path: "/product/abc",
    image: "https://cdn.example/x.jpg",
    priceNpr: 2100,
    brandName: "Kastha Studio",
    inStock: true,
  };

  it("builds an Offer in NPR with an InStock availability", () => {
    const node = productSchema(base);
    const offer = node.offers as Record<string, unknown>;
    expect(offer.priceCurrency).toBe("NPR");
    expect(offer.price).toBe(2100);
    expect(offer.availability).toBe("https://schema.org/InStock");
  });

  it("marks an out-of-stock product accordingly", () => {
    const node = productSchema({ ...base, inStock: false });
    const offer = node.offers as Record<string, unknown>;
    expect(offer.availability).toBe("https://schema.org/OutOfStock");
  });

  it("only includes aggregateRating when there are reviews", () => {
    expect(productSchema(base)).not.toHaveProperty("aggregateRating");
    const rated = productSchema({ ...base, ratingValue: 4.6, reviewCount: 12 });
    const rating = rated.aggregateRating as Record<string, unknown>;
    expect(rating.ratingValue).toBe(4.6);
    expect(rating.reviewCount).toBe(12);
  });
});

describe("itemListSchema", () => {
  it("counts and positions its entries", () => {
    const node = itemListSchema("Streetwear", [
      { name: "A", path: "/product/a" },
      { name: "B", path: "/product/b" },
    ]);
    expect(node.numberOfItems).toBe(2);
    expect((node.itemListElement as Record<string, unknown>[])[1]?.position).toBe(2);
  });
});

describe("collectionPageSchema / brandStoreSchema / profilePageSchema", () => {
  it("collectionPageSchema is a CollectionPage tied to the website node", () => {
    const node = collectionPageSchema({
      name: "Dashain Edit",
      description: "d",
      path: "/collections/x",
    });
    expect(node["@type"]).toBe("CollectionPage");
    expect((node.isPartOf as Record<string, unknown>)["@id"]).toContain("#website");
  });

  it("brandStoreSchema is a Brand with an absolute url", () => {
    const node = brandStoreSchema({ name: "Kastha", description: "d", path: "/brand/x" });
    expect(node["@type"]).toBe("Brand");
    expect(String(node.url)).toMatch(/\/brand\/x$/);
  });

  it("profilePageSchema wraps a Person with an @handle alternateName", () => {
    const node = profilePageSchema({ name: "Sabin", handle: "sabin", path: "/creator/sabin" });
    const person = node.mainEntity as Record<string, unknown>;
    expect(person["@type"]).toBe("Person");
    expect(person.alternateName).toBe("@sabin");
  });
});

describe("faqPageSchema", () => {
  it("maps each entry to a Question with an accepted Answer", () => {
    const node = faqPageSchema([{ question: "Q?", answer: "A." }]);
    const entities = node.mainEntity as Record<string, unknown>[];
    expect(entities[0]?.["@type"]).toBe("Question");
    expect((entities[0]?.acceptedAnswer as Record<string, unknown>).text).toBe("A.");
  });
});
