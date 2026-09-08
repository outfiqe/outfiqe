import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, ProductStatus } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createBrand = () =>
  prisma.brand.create({
    data: {
      name: `Tag Review Brand ${randomUUID().slice(0, 8)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createCreator = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@creator.outfiqe.test`,
      name: "Tag Review Creator",
      handle: `trc-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createTaggedLook = async () => {
  const [creator, brand] = await Promise.all([createCreator(), createBrand()]);
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Tagged Item",
      price: 1200,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
  const look = await prisma.creatorLook.create({
    data: {
      creatorId: creator.id,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      caption: "schema check",
    },
  });
  const tag = await prisma.creatorLookProduct.create({
    data: { creatorLookId: look.id, productId: product.id, sizeWorn: "M" },
  });
  return { creator, brand, product, look, tag };
};

describe("brand tag-review schema", () => {
  it("defaults a new brand to TRUSTED_ONLY with verified-buyer auto-approve on", async () => {
    const brand = await createBrand();

    expect(brand.tagReviewPolicy).toBe("TRUSTED_ONLY");
    expect(brand.autoApproveVerifiedBuyers).toBe(true);
  });

  it("creates a new product tag as PENDING with no reviewer and no re-requests", async () => {
    const { tag } = await createTaggedLook();

    expect(tag.reviewStatus).toBe("PENDING");
    expect(tag.approvalSource).toBeNull();
    expect(tag.reviewedById).toBeNull();
    expect(tag.reviewedAt).toBeNull();
    expect(tag.rejectionReason).toBeNull();
    expect(tag.reRequestCount).toBe(0);
    expect(tag.submittedAt).toBeInstanceOf(Date);
  });

  it("records the reviewer and clears them again via SetNull when that user is deleted", async () => {
    const { tag } = await createTaggedLook();
    const reviewer = await createCreator();

    await prisma.creatorLookProduct.update({
      where: { id: tag.id },
      data: {
        reviewStatus: "APPROVED",
        approvalSource: "BRAND",
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      },
    });
    await prisma.user.delete({ where: { id: reviewer.id } });

    const after = await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } });
    expect(after.reviewStatus).toBe("APPROVED");
    expect(after.reviewedById).toBeNull();
  });

  it("grandfathers pre-existing tags to APPROVED without touching submitted_at ordering", async () => {
    const { tag } = await createTaggedLook();
    const wrongSubmittedAt = new Date("2000-01-01T00:00:00.000Z");
    await prisma.creatorLookProduct.update({
      where: { id: tag.id },
      data: {
        reviewStatus: "PENDING",
        approvalSource: null,
        reviewedAt: null,
        submittedAt: wrongSubmittedAt,
      },
    });

    await prisma.$executeRaw`
      UPDATE "creator_look_products"
      SET "review_status" = 'APPROVED',
          "approval_source" = 'GRANDFATHERED',
          "reviewed_at" = now(),
          "submitted_at" = "created_at"
      WHERE "id" = ${tag.id}::uuid
    `;

    const after = await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } });
    expect(after.reviewStatus).toBe("APPROVED");
    expect(after.approvalSource).toBe("GRANDFATHERED");
    expect(after.reviewedAt).toBeInstanceOf(Date);
    expect(after.submittedAt.getTime()).not.toBe(wrongSubmittedAt.getTime());
    expect(after.submittedAt.getTime()).toBe(after.createdAt.getTime());
  });

  it("keys BrandTrustedCreator on the brand/creator pair", async () => {
    const [brand, creator, granter] = await Promise.all([
      createBrand(),
      createCreator(),
      createCreator(),
    ]);

    await prisma.brandTrustedCreator.create({
      data: { brandId: brand.id, creatorId: creator.id, grantedById: granter.id },
    });

    await expect(
      prisma.brandTrustedCreator.create({
        data: { brandId: brand.id, creatorId: creator.id },
      }),
    ).rejects.toThrow();
  });
});
