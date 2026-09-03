export type ProductTypeRecord = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductTypeWithCounts = ProductTypeRecord & {
  productCount: number;
  sizeOptionCount: number;
};

export type CreateProductTypeInput = {
  slug: string;
  label: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateProductTypeInput = Partial<CreateProductTypeInput>;
