import { sumStock } from "./product.utils.js";

export const withActiveDiscount = () => {
  const now = new Date();
  return {
    discounts: {
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" as const },
      take: 1,
    },
  };
};

export const withBrandAndCategories = {
  brand: { select: { name: true } },
  categories: { select: { slug: true, name: true } },
  productType: { select: { slug: true, label: true } },
  sizes: { select: { id: true, label: true, stock: true }, orderBy: { sortOrder: "asc" as const } },
};

export const withTotalStock = <T extends { sizes: { stock: number }[] }>(
  rows: T[],
): (Omit<T, "sizes"> & { totalStock: number })[] =>
  rows.map(({ sizes, ...rest }) => ({ ...rest, totalStock: sumStock(sizes) }));
