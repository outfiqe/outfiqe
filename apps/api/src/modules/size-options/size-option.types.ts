export type SizeOptionRecord = {
  id: string;
  productTypeId: string;
  label: string;
  sortOrder: number;
  createdAt: Date;
  productType: { slug: string };
};

export type CreateSizeOptionInput = {
  productTypeId: string;
  label: string;
  sortOrder?: number;
};
