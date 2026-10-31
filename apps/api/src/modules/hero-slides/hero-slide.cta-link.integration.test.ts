import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CollectionStatus } from "#generated/prisma/enums.js";

import { heroSlideService } from "./hero-slide.service.js";

const CTA_TARGET_NOT_FOUND_CODE = "HERO_CTA_TARGET_NOT_FOUND";

const buildSlideInput = (ctaHref: string) => ({
  tag: "New",
  title: "Fresh drops",
  description: "This week's arrivals",
  imageUrl: `https://cdn.outfiqe.test/uploads/${randomUUID()}.jpg`,
  ctaLabel: "Shop now",
  ctaHref,
});

const createCollection = (status: CollectionStatus) => {
  const slug = `collection-${randomUUID().slice(0, 8)}`;
  return prisma.collection.create({
    data: { name: slug, slug, description: "Test collection", status },
  });
};

describe("heroSlideService CTA links", () => {
  it("accepts a link to a published collection", async () => {
    const { slug } = await createCollection(CollectionStatus.PUBLISHED);

    const slide = await heroSlideService.create(buildSlideInput(`/collections/${slug}`));

    expect(slide.ctaHref).toBe(`/collections/${slug}`);
  });

  it("accepts a link to any other page", async () => {
    const slide = await heroSlideService.create(buildSlideInput("/shop"));

    expect(slide.ctaHref).toBe("/shop");
  });

  it("rejects a link to a collection that does not exist", async () => {
    await expect(
      heroSlideService.create(buildSlideInput("/collections/does-not-exist")),
    ).rejects.toMatchObject({ code: CTA_TARGET_NOT_FOUND_CODE });
  });

  it("rejects a link to a draft collection", async () => {
    const { slug } = await createCollection(CollectionStatus.DRAFT);

    await expect(
      heroSlideService.create(buildSlideInput(`/collections/${slug}`)),
    ).rejects.toMatchObject({ code: CTA_TARGET_NOT_FOUND_CODE });
  });

  it("rejects the singular collection path, which has no page", async () => {
    await expect(
      heroSlideService.create(buildSlideInput("/collection/new-season")),
    ).rejects.toMatchObject({ code: CTA_TARGET_NOT_FOUND_CODE });
  });

  it("checks the new link when a slide is updated", async () => {
    const slide = await heroSlideService.create(buildSlideInput("/shop"));

    await expect(
      heroSlideService.update(slide.id, { ctaHref: "/collections/does-not-exist" }),
    ).rejects.toMatchObject({ code: CTA_TARGET_NOT_FOUND_CODE });
  });
});
