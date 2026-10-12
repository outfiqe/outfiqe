import { SIZE_FIT_COLUMNS_SELECT, toFitRange } from "#lib/fit-range.utils.js";
import type { SizeFitColumns } from "#types/fit-range.types.js";

import type { BrandProductSize, BrandProductSizeWithFit } from "./product.types.js";
import { sumStock } from "./product.utils.js";

type BrandProductSizeRow = BrandProductSize & SizeFitColumns;

type WithTotalStockAndFitSizes<T> = Omit<T, "sizes"> & {
  totalStock: number;
  sizes: BrandProductSizeWithFit[];
};

export const toWithTotalStockAndSizes = <T extends { sizes: BrandProductSizeRow[] }>({
  sizes,
  ...rest
}: T): WithTotalStockAndFitSizes<T> => ({
  ...rest,
  totalStock: sumStock(sizes),
  sizes: sizes.map(({ id, label, stock, ...fitColumns }) => ({
    id,
    label,
    stock,
    fitRange: toFitRange(fitColumns),
  })),
});

export const withTotalStockAndSizes = <T extends { sizes: BrandProductSizeRow[] }>(
  rows: T[],
): WithTotalStockAndFitSizes<T>[] => rows.map(toWithTotalStockAndSizes);

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
  sizes: {
    select: { id: true, label: true, stock: true, ...SIZE_FIT_COLUMNS_SELECT },
    orderBy: { sortOrder: "asc" as const },
  },
};

export const withTotalStock = <T extends { sizes: { stock: number }[] }>(
  rows: T[],
): (Omit<T, "sizes"> & { totalStock: number })[] =>
  rows.map(({ sizes, ...rest }) => ({ ...rest, totalStock: sumStock(sizes) }));
