import { Badge, Button, cn, OutfitSlotIcon, toast } from "@outfiqe/design-system";
import { useApiMutation, useDragReorder } from "@outfiqe/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import { useState } from "react";

import { ReorderRowSkeleton } from "@/components/ReorderRowSkeleton";
import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { productTypesApi } from "@/features/product-types/api";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { outfitSlotTypesApi } from "./api";
import { OUTFIT_SLOT_TYPES_QUERY_KEY, PRODUCT_TYPES_QUERY_KEY } from "./outfitSlotTypes.constants";
import type { OutfitSlotType } from "./schemas";
import { SlotTypeFormModal } from "./SlotTypeFormModal";

const SKELETON_ROW_COUNT = 4;
const SINGLE_ITEM = 1;
const FIRST_ROW_INDEX = 0;
const ROW_STEP = 1;

type OpenForm = { mode: "create" } | { mode: "edit"; slotType: OutfitSlotType };

const describeCapacity = (maxItems: number) =>
  maxItems === SINGLE_ITEM ? "Holds 1 item" : `Holds up to ${maxItems} items`;

const describeFilledBy = ({ acceptsAnyProductType, productTypes }: OutfitSlotType) =>
  acceptsAnyProductType
    ? "Any garment type"
    : productTypes.map((productType) => productType.label).join(", ");

const describeBlocks = ({ blocksSlotTypes, blockedBySlotTypes }: OutfitSlotType) => {
  const exclusiveSlotLabels = new Set(
    [...blocksSlotTypes, ...blockedBySlotTypes].map((slotType) => slotType.label),
  );
  return [...exclusiveSlotLabels].join(", ");
};

export const OutfitSlotTypesPage = () => {
  const queryClient = useQueryClient();
  const { canUse } = usePlatformPermissions();
  const canManageCatalog = canUse(PLATFORM_MANAGE_PERMISSION.CATALOG);
  const [openForm, setOpenForm] = useState<OpenForm | null>(null);

  const {
    data: slotTypes,
    isLoading,
    isError,
    error,
  } = useQuery({ queryKey: OUTFIT_SLOT_TYPES_QUERY_KEY, queryFn: outfitSlotTypesApi.list });
  const { data: garmentTypes } = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: productTypesApi.list,
    enabled: canManageCatalog,
  });

  const toggleActive = useApiMutation({
    mutationFn: (slotType: OutfitSlotType) =>
      outfitSlotTypesApi.setActive(slotType.id, !slotType.isActive),
    invalidateKeys: [OUTFIT_SLOT_TYPES_QUERY_KEY],
    successMessage: (updated) =>
      updated.isActive ? "Slot type switched on." : "Slot type switched off.",
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => outfitSlotTypesApi.reorder(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: OUTFIT_SLOT_TYPES_QUERY_KEY });
      const previous = queryClient.getQueryData<OutfitSlotType[]>(OUTFIT_SLOT_TYPES_QUERY_KEY);
      if (previous) {
        const slotTypesById = new Map(previous.map((slotType) => [slotType.id, slotType]));
        queryClient.setQueryData(
          OUTFIT_SLOT_TYPES_QUERY_KEY,
          orderedIds
            .map((id) => slotTypesById.get(id))
            .filter((slotType): slotType is OutfitSlotType => !!slotType),
        );
      }
      return { previous };
    },
    onError: (mutationError, _orderedIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(OUTFIT_SLOT_TYPES_QUERY_KEY, context.previous);
      }
      toast.error(getErrorMessage(mutationError));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: OUTFIT_SLOT_TYPES_QUERY_KEY }),
  });

  const { getDragProps, moveEntry, draggingId, dragOverId } = useDragReorder({
    order: slotTypes ?? [],
    getId: (slotType) => slotType.id,
    onReorder: (nextOrder) => reorder.mutate(nextOrder.map((slotType) => slotType.id)),
  });

  const editingSlotType = openForm?.mode === "edit" ? openForm.slotType : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Outfit slots</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The slots every new Outfit Build starts with, in this order. Each slot says which
            garment types can fill it and how many items it holds.
          </p>
        </div>
        {canManageCatalog && (
          <Button onClick={() => setOpenForm({ mode: "create" })}>
            <Plus />
            New slot type
          </Button>
        )}
      </div>

      <div className="mt-6 space-y-3" aria-busy={isLoading}>
        {isLoading &&
          Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <ReorderRowSkeleton key={index} actionLabel="Switch off" />
          ))}

        {isError && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t load slot types. {getErrorMessage(error)}
          </p>
        )}

        {slotTypes?.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No slot types yet. Builds need at least one slot, so add one before switching Outfit
            Build on.
          </p>
        )}

        {slotTypes?.map((slotType, index) => {
          const { id, label, key, icon, maxItems, isActive } = slotType;
          const blockedSlots = describeBlocks(slotType);

          return (
            <div
              key={id}
              {...(canManageCatalog ? getDragProps(id) : {})}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors",
                draggingId === id && "opacity-50",
                dragOverId === id && "border-foreground",
              )}
            >
              {canManageCatalog && (
                <>
                  <span
                    aria-hidden
                    className="cursor-grab text-muted-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Move ${label} up`}
                      disabled={index === FIRST_ROW_INDEX || reorder.isPending}
                      onClick={() => moveEntry(index, index - ROW_STEP)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Move ${label} down`}
                      disabled={index === slotTypes.length - ROW_STEP || reorder.isPending}
                      onClick={() => moveEntry(index, index + ROW_STEP)}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </>
              )}

              <OutfitSlotIcon icon={icon} className="size-6 text-muted-foreground" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">{label}</h2>
                  <Badge tone={isActive ? "positive" : "neutral"} showDot={false}>
                    {isActive ? "ON" : "OFF"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  /{key} · {describeCapacity(maxItems)} · {describeFilledBy(slotType)}
                </p>
                {blockedSlots && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Can&apos;t be filled at the same time as {blockedSlots}
                  </p>
                )}
              </div>

              {canManageCatalog && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpenForm({ mode: "edit", slotType })}>
                    Edit
                  </Button>
                  <Button
                    variant={isActive ? "ghost" : "default"}
                    onClick={() => toggleActive.mutate(slotType)}
                    disabled={toggleActive.isPending}
                  >
                    {isActive ? "Switch off" : "Switch on"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {openForm && (
        <SlotTypeFormModal
          slotType={editingSlotType}
          garmentTypes={garmentTypes ?? []}
          otherSlotTypes={(slotTypes ?? []).filter(
            (slotType) => slotType.id !== editingSlotType?.id,
          )}
          onClose={() => setOpenForm(null)}
        />
      )}
    </div>
  );
};
