export type SavedSizeView = {
  productTypeId: string;
  productTypeSlug: string;
  productTypeLabel: string;
  sizeOptions: string[];
  savedSize: string | null;
  lastBoughtSize: string | null;
};

export type LastBoughtSize = { productTypeId: string; sizeLabel: string };
