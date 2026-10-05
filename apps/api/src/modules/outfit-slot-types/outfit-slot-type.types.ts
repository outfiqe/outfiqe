export type OutfitSlotTypeProductTypeView = {
  id: string;
  slug: string;
  label: string;
};

export type OutfitSlotTypeReferenceView = {
  id: string;
  key: string;
  label: string;
};

export type OutfitSlotTypeView = {
  id: string;
  key: string;
  label: string;
  icon: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  sortOrder: number;
  isActive: boolean;
  productTypes: OutfitSlotTypeProductTypeView[];
  blocksSlotTypes: OutfitSlotTypeReferenceView[];
  blockedBySlotTypes: OutfitSlotTypeReferenceView[];
  createdAt: Date;
  updatedAt: Date;
};

export type OutfitSlotTypeFields = {
  label: string;
  icon: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  isActive: boolean;
};

export type CreateOutfitSlotTypeInput = OutfitSlotTypeFields & {
  key: string;
  productTypeIds: string[];
  blocksSlotTypeIds: string[];
};

export type UpdateOutfitSlotTypeInput = Partial<OutfitSlotTypeFields> & {
  productTypeIds?: string[];
  blocksSlotTypeIds?: string[];
};

export type OutfitSlotTypeChange = {
  before: OutfitSlotTypeView;
  after: OutfitSlotTypeView;
};
