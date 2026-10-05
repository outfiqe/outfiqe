import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { OutfitEventType, OutfitMemberRole, ProductStatus } from "#generated/prisma/enums.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createUser = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Build Tester",
      handle: `build-tester-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });

const createProduct = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Build Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Maroon Kurta",
      price: 3_200,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
};

const createOutfitWithTopSlot = async () => {
  const owner = await createUser();
  const outfit = await prisma.outfit.create({
    data: {
      createdById: owner.id,
      members: { create: { userId: owner.id, role: OutfitMemberRole.OWNER } },
    },
  });
  const topSlot = await prisma.outfitSlot.create({
    data: {
      outfitId: outfit.id,
      key: "top",
      label: "Top",
      icon: "shirt",
      maxItems: 1,
      acceptsAnyProductType: false,
      productTypeIds: [await ensureProductType()],
      blocksSlotKeys: [],
      sortOrder: 0,
    },
  });
  return { owner, outfit, topSlot };
};

describe("outfit database rules", () => {
  it("allows only one owner per build", async () => {
    const { outfit } = await createOutfitWithTopSlot();
    const secondOwner = await createUser();

    await expect(
      prisma.outfitMember.create({
        data: { outfitId: outfit.id, userId: secondOwner.id, role: OutfitMemberRole.OWNER },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.outfitMember.create({
        data: { outfitId: outfit.id, userId: secondOwner.id, role: OutfitMemberRole.EDITOR },
      }),
    ).resolves.toMatchObject({ role: OutfitMemberRole.EDITOR });
  });

  it("refuses a per-person item limit outside 1 to 3, and a negative budget", async () => {
    const { outfit } = await createOutfitWithTopSlot();

    await expect(
      prisma.outfit.update({ where: { id: outfit.id }, data: { maxItemsPerMember: 4 } }),
    ).rejects.toThrow();
    await expect(
      prisma.outfit.update({ where: { id: outfit.id }, data: { maxItemsPerMember: 0 } }),
    ).rejects.toThrow();
    await expect(
      prisma.outfit.update({ where: { id: outfit.id }, data: { budget: -1 } }),
    ).rejects.toThrow();

    await expect(
      prisma.outfit.update({
        where: { id: outfit.id },
        data: { maxItemsPerMember: 3, budget: 0 },
      }),
    ).resolves.toMatchObject({ maxItemsPerMember: 3, budget: 0 });
  });

  it("refuses the same product twice on one board and two items in one slot position", async () => {
    const { owner, outfit, topSlot } = await createOutfitWithTopSlot();
    const kurta = await createProduct();
    const shirt = await createProduct();
    const extraSlot = await prisma.outfitSlot.create({
      data: {
        outfitId: outfit.id,
        key: "extra",
        label: "Extra",
        icon: "sparkles",
        maxItems: 3,
        acceptsAnyProductType: true,
        productTypeIds: [],
        blocksSlotKeys: [],
        sortOrder: 1,
      },
    });

    await prisma.outfitItem.create({
      data: {
        outfitId: outfit.id,
        outfitSlotId: topSlot.id,
        position: 0,
        productId: kurta.id,
        addedById: owner.id,
      },
    });

    await expect(
      prisma.outfitItem.create({
        data: { outfitId: outfit.id, outfitSlotId: extraSlot.id, position: 0, productId: kurta.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.outfitItem.create({
        data: { outfitId: outfit.id, outfitSlotId: topSlot.id, position: 0, productId: shirt.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.outfitItem.create({
        data: {
          outfitId: outfit.id,
          outfitSlotId: extraSlot.id,
          position: -1,
          productId: shirt.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("refuses an item whose slot belongs to a different build", async () => {
    const { outfit } = await createOutfitWithTopSlot();
    const { topSlot: otherBuildSlot } = await createOutfitWithTopSlot();
    const kurta = await createProduct();

    await expect(
      prisma.outfitItem.create({
        data: {
          outfitId: outfit.id,
          outfitSlotId: otherBuildSlot.id,
          position: 0,
          productId: kurta.id,
        },
      }),
    ).rejects.toThrow();
  });

  it("numbers history once per version", async () => {
    const { owner, outfit } = await createOutfitWithTopSlot();
    const createdEvent = {
      outfitId: outfit.id,
      version: 0,
      actorId: owner.id,
      type: OutfitEventType.CREATED,
      payload: {},
    };

    await prisma.outfitEvent.create({ data: createdEvent });
    await expect(prisma.outfitEvent.create({ data: createdEvent })).rejects.toThrow();
  });

  it("publishes a build version as a creator's look only once", async () => {
    const { owner, outfit } = await createOutfitWithTopSlot();
    const lookFromBuild = {
      creatorId: owner.id,
      imageUrl: "https://cdn.outfiqe.test/look.jpg",
      sourceOutfitId: outfit.id,
      sourceOutfitVersion: 1,
    };

    await prisma.creatorLook.create({ data: lookFromBuild });
    await expect(prisma.creatorLook.create({ data: lookFromBuild })).rejects.toThrow();
    await expect(
      prisma.creatorLook.create({ data: { ...lookFromBuild, sourceOutfitVersion: 2 } }),
    ).resolves.toMatchObject({ sourceOutfitVersion: 2 });
  });

  it("keeps ordinary looks with no source build unaffected by the publish rule", async () => {
    const creator = await createUser();
    const ordinaryLook = { creatorId: creator.id, imageUrl: "https://cdn.outfiqe.test/a.jpg" };

    await prisma.creatorLook.create({ data: ordinaryLook });
    await expect(prisma.creatorLook.create({ data: ordinaryLook })).resolves.toBeTruthy();
  });

  it("keeps a product on a board from being hard-deleted", async () => {
    const { outfit, topSlot } = await createOutfitWithTopSlot();
    const kurta = await createProduct();
    await prisma.outfitItem.create({
      data: { outfitId: outfit.id, outfitSlotId: topSlot.id, position: 0, productId: kurta.id },
    });

    await expect(prisma.product.delete({ where: { id: kurta.id } })).rejects.toThrow();
  });
});
