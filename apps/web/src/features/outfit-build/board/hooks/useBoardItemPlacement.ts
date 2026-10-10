"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { toast } from "@outfiqe/design-system";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";

import type { PublicProduct } from "@/features/products/api/productSchemas";
import type { PublicProductType } from "@/features/products/api/productTypesApi";

import { outfitApi } from "../../api/outfitApi";
import type { OutfitBoard, OutfitProduct, OutfitSlot } from "../../api/outfitSchemas";
import type { ProductPickerModal } from "../components/ProductPickerModal";
import {
  findBoardRefusal,
  firstFreePosition,
  withItemPlaced,
  withItemRemoved,
} from "../utils/outfitBoardRules";
import { toOutfitProduct } from "../utils/toOutfitProduct";
import type { useOutfitWrites } from "./useOutfitWrites";

const SWAPPED_POSITION_WHEN_FULL = 0;

type PickerTarget = {
  slot: OutfitSlot;
  position: number;
  replacing: ComponentProps<typeof ProductPickerModal>["replacing"];
} | null;

type BoardItemPlacementOptions = {
  board: OutfitBoard;
  currentUserId: string | undefined;
  productTypes: PublicProductType[];
  runWrite: ReturnType<typeof useOutfitWrites>["runWrite"];
};

const isPublicProduct = (value: unknown): value is PublicProduct =>
  typeof value === "object" && value !== null && "id" in value && "effectivePrice" in value;

export const useBoardItemPlacement = ({
  board,
  currentUserId,
  productTypes,
  runWrite,
}: BoardItemPlacementOptions) => {
  const tWrites = useTranslations("outfitBuild.writes");
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const typeIdBySlug = new Map(
    productTypes.map((productType) => [productType.slug, productType.id]),
  );
  const me = board.members.find(({ user }) => user.id === currentUserId)?.user ?? null;

  const placeOutfitProduct = (slot: OutfitSlot, position: number, outfitProduct: OutfitProduct) => {
    if (!currentUserId) return;

    const refusal = findBoardRefusal(board, {
      slotKey: slot.key,
      position,
      productId: outfitProduct.id,
      productTypeId: outfitProduct.productTypeId,
      addedById: currentUserId,
    });
    if (refusal) {
      toast.error(tWrites(`refusals.${refusal}`));
      return;
    }

    void runWrite(
      (write) => outfitApi.placeItem(write, slot.key, position, outfitProduct.id),
      (current) =>
        withItemPlaced(current, {
          slotKey: slot.key,
          position,
          product: outfitProduct,
          addedBy: me,
        }),
    );
  };

  const placeProduct = (slot: OutfitSlot, position: number, product: PublicProduct) => {
    const productTypeId = typeIdBySlug.get(product.type);
    if (productTypeId) placeOutfitProduct(slot, position, toOutfitProduct(product, productTypeId));
  };

  const openPicker = (slot: OutfitSlot, position: number) => {
    const currentProduct = slot.items.find((item) => item.position === position)?.product;
    setPickerTarget({
      slot,
      position,
      replacing: currentProduct
        ? {
            product: currentProduct,
            target: { outfitId: board.id, slotKey: slot.key, position },
          }
        : null,
    });
  };

  const removeItem = (slot: OutfitSlot, position: number) =>
    void runWrite(
      (write) => outfitApi.removeItem(write, slot.key, position),
      (current) => withItemRemoved(current, slot.key, position),
    );

  const dropProductOnSlot = ({ active, over }: DragEndEvent) => {
    const product: unknown = active.data.current?.product;
    const slotKey: unknown = over?.data.current?.slotKey;
    const slot = board.slots.find((candidate) => candidate.key === slotKey);
    if (!slot || !isPublicProduct(product)) return;
    placeProduct(slot, firstFreePosition(slot) ?? SWAPPED_POSITION_WHEN_FULL, product);
  };

  return {
    pickerTarget,
    setPickerTarget,
    placeOutfitProduct,
    placeProduct,
    openPicker,
    removeItem,
    dropProductOnSlot,
  };
};
