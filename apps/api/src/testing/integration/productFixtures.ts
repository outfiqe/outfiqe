import { prisma } from "#db/prisma.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";

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
