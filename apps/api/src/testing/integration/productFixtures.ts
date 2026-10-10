import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";

import { uniquePhone } from "./uniqueValues.js";

const DEFAULT_SLUG = "tops";

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

export const ensureProductType = async (
  slug: string = DEFAULT_SLUG,
  label: string = capitalize(slug),
): Promise<string> => {
  const existing = await prisma.productType.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing.id;

  try {
    const created = await prisma.productType.create({
      data: { slug, label },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await prisma.productType.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    });
    return raced.id;
  }
};

export type BrandOwnerSession = {
  userId: string;
  brandId: string;
  authHeader: string;
};

export const createBrandOwnerSession = async (): Promise<BrandOwnerSession> => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `brand-owner-${suffix}@outfiqe.test`,
      name: "Brand Owner",
      handle: `brand-owner-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.BRAND_OWNER,
    },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Test Brand ${suffix}`,
      contactName: "Contact",
      email: `${suffix}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@brand${suffix}`,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: user.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  const { accessToken } = generateTokenpair({ sub: user.id, role: UserRole.BRAND_OWNER });
  return { userId: user.id, brandId: brand.id, authHeader: `Bearer ${accessToken}` };
};
