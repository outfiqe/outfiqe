import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { type OutfitSlotType, outfitSlotTypeSchema } from "./outfitSlotTypesSchemas";

const listSchema = z.array(outfitSlotTypeSchema);

export type OutfitSlotTypeChanges = {
  label: string;
  icon: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  productTypeIds: string[];
  blocksSlotTypeIds: string[];
};

export type CreateOutfitSlotTypeInput = OutfitSlotTypeChanges & { key: string };

export const outfitSlotTypesApi = {
  async list(): Promise<OutfitSlotType[]> {
    const res = await apiClient.get<OutfitSlotType[]>("/outfit-slot-types/admin");
    return listSchema.parse(res.data);
  },

  async create(input: CreateOutfitSlotTypeInput): Promise<OutfitSlotType> {
    const res = await apiClient.post<OutfitSlotType>("/outfit-slot-types", input);
    return outfitSlotTypeSchema.parse(res.data);
  },

  async update(id: string, changes: Partial<OutfitSlotTypeChanges>): Promise<OutfitSlotType> {
    const res = await apiClient.patch<OutfitSlotType>(`/outfit-slot-types/${id}`, changes);
    return outfitSlotTypeSchema.parse(res.data);
  },

  async setActive(id: string, isActive: boolean): Promise<OutfitSlotType> {
    const res = await apiClient.patch<OutfitSlotType>(`/outfit-slot-types/${id}`, { isActive });
    return outfitSlotTypeSchema.parse(res.data);
  },

  async reorder(orderedIds: string[]): Promise<void> {
    await apiClient.post("/outfit-slot-types/reorder", { orderedIds });
  },
};
