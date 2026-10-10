"use client";

import { useDroppable } from "@dnd-kit/core";
import { Button, cn, OutfitSlotIcon } from "@outfiqe/design-system";
import { Plus, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { AppImage } from "@/shared/components/AppImage";

import type { OutfitProduct, OutfitSlot } from "../../api/outfitSchemas";
import { PersonAvatar } from "../../components/PersonAvatar";
import { formatLakhAmount } from "../../utils/outfitFormatting";
import { describeSizeFit, SIZE_FIT } from "../utils/outfitBoardRules";
import { AvailabilityLabel } from "./AvailabilityLabel";

export const slotDropTargetId = (slotKey: string) => `slot:${slotKey}`;

const NO_ITEMS = 0;
const SINGLE_ITEM = 1;

type SlotCardProps = {
  slot: OutfitSlot;
  canEdit: boolean;
  mySizeByProductType: ReadonlyMap<string, string>;
  onAddAt: (slot: OutfitSlot, position: number) => void;
  onRemoveAt: (slot: OutfitSlot, position: number) => void;
};

const SIZE_FIT_MESSAGE_KEY = {
  [SIZE_FIT.IN_STOCK]: "yourSizeInStock",
  [SIZE_FIT.SOLD_OUT]: "yourSizeSoldOut",
  [SIZE_FIT.NOT_OFFERED]: "notInYourSize",
} as const;

const MySizeLabel = ({ product, mySize }: { product: OutfitProduct; mySize: string }) => {
  const t = useTranslations("outfitBuild.slots");
  const sizeFit = describeSizeFit(product, mySize);
  if (!sizeFit) return null;
  return (
    <p
      className={cn(
        "mt-0.5 text-xs",
        sizeFit === SIZE_FIT.IN_STOCK ? "text-muted-foreground" : "text-destructive",
      )}
    >
      {t(SIZE_FIT_MESSAGE_KEY[sizeFit], { size: mySize })}
    </p>
  );
};

export const SlotCard = ({
  slot,
  canEdit,
  mySizeByProductType,
  onAddAt,
  onRemoveAt,
}: SlotCardProps) => {
  const t = useTranslations("outfitBuild.slots");
  const tBudget = useTranslations("outfitBuild.budget");
  const canDrop = canEdit && !slot.isBlocked;
  const { setNodeRef, isOver } = useDroppable({
    id: slotDropTargetId(slot.key),
    data: { slotKey: slot.key },
    disabled: !canDrop,
  });

  const positions = Array.from({ length: slot.maxItems }, (_, position) => position);
  const itemByPosition = new Map(slot.items.map((item) => [item.position, item]));

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`slot-${slot.key}-title`}
      className={cn(
        "rounded-xl border border-border bg-card p-3 transition-colors",
        isOver && "border-foreground bg-muted",
        slot.isBlocked && "opacity-70",
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <OutfitSlotIcon icon={slot.icon} className="size-4 text-muted-foreground" />
        <h3
          id={`slot-${slot.key}-title`}
          className="text-xs font-bold uppercase tracking-wide text-foreground"
        >
          {slot.label}
        </h3>
        {slot.maxItems > SINGLE_ITEM && (
          <span className="text-xs text-muted-foreground">
            {t("filledOf", { filled: slot.items.length, max: slot.maxItems })}
          </span>
        )}
      </header>

      {slot.isBlocked && slot.items.length === NO_ITEMS && (
        <p className="mb-2 text-xs text-muted-foreground">{t("blocked")}</p>
      )}

      <ul className="space-y-2">
        {positions.map((position) => {
          const item = itemByPosition.get(position);
          if (!item) {
            return (
              <li key={position}>
                {canEdit ? (
                  <button
                    type="button"
                    disabled={slot.isBlocked}
                    onClick={() => onAddAt(slot, position)}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-muted-foreground"
                  >
                    <Plus className="size-4" aria-hidden />
                    {t("addTo", { slot: slot.label })}
                  </button>
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </p>
                )}
              </li>
            );
          }

          const { product, addedBy } = item;
          const mySize = mySizeByProductType.get(product.productTypeId);
          const isSoldOut = product.availability === "OUT_OF_STOCK";
          return (
            <li key={position} className="flex items-start gap-3 rounded-lg bg-muted/50 p-2">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {product.imageUrl && (
                  <AppImage src={product.imageUrl} alt={product.name} fill sizes="64px" />
                )}
                {addedBy && (
                  <span
                    className="absolute bottom-0.5 right-0.5"
                    title={t("addedBy", { name: addedBy.name })}
                  >
                    <PersonAvatar person={addedBy} className="size-5 ring-2 ring-background" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {tBudget("rupees", { amount: formatLakhAmount(product.price) })} ·{" "}
                  {product.brand.name}
                </p>
                <AvailabilityLabel availability={product.availability} className="mt-1" />
                {mySize && !isSoldOut && <MySizeLabel product={product} mySize={mySize} />}
                {addedBy && <span className="sr-only">{t("addedBy", { name: addedBy.name })}</span>}
                {canEdit && isSoldOut && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1.5"
                    aria-label={t("swap", { product: product.name })}
                    onClick={() => onAddAt(slot, position)}
                  >
                    {t("swapSoldOut")}
                  </Button>
                )}
              </div>
              {canEdit && (
                <div className="flex flex-col gap-1">
                  {!isSoldOut && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("swap", { product: product.name })}
                      onClick={() => onAddAt(slot, position)}
                    >
                      <RefreshCw className="size-4" aria-hidden />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t("remove", { product: product.name })}
                    onClick={() => onRemoveAt(slot, position)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
