"use client";

import { Skeleton } from "@outfiqe/design-system";
import type { Message } from "@outfiqe/types";
import { Shirt } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { AppImage } from "@/shared/components/AppImage";

import { useOutfit } from "../board/hooks/useOutfit";
import { buildPath } from "../my-builds/components/BuildSummaryCard";
import { formatLakhAmount } from "../utils/outfitFormatting";

const PREVIEW_IMAGE_COUNT = 3;
const NO_ITEMS = 0;

const BuildCardBody = ({ outfitId }: { outfitId: string }) => {
  const t = useTranslations("outfitBuild.card");
  const tBudget = useTranslations("outfitBuild.budget");
  const tBoard = useTranslations("outfitBuild.board");
  const { data: outfit, isPending, isError } = useOutfit(outfitId);

  if (isPending) return <Skeleton className="h-24 w-64 rounded-xl" />;
  if (isError || !outfit) {
    return <p className="text-sm text-muted-foreground">{t("unavailable")}</p>;
  }

  const productImages =
    outfit.kind === "board"
      ? outfit.slots.flatMap((slot) => slot.items.map((slotItem) => slotItem.product.imageUrl))
      : outfit.items.map((buildItem) => buildItem.imageUrl);
  const previewImages = productImages
    .filter((imageUrl): imageUrl is string => imageUrl !== null)
    .slice(0, PREVIEW_IMAGE_COUNT);
  const itemCount = productImages.length;
  const isFullyAvailable = outfit.kind === "board" ? outfit.isFullyAvailable : true;

  return (
    <Link
      href={buildPath(outfitId)}
      className="block w-64 cursor-pointer overflow-hidden rounded-xl border border-border bg-card hover:border-foreground focus-visible:border-foreground"
    >
      <div className="flex h-20 gap-0.5 bg-muted">
        {previewImages.map((imageUrl) => (
          <span key={imageUrl} className="relative flex-1">
            <AppImage src={imageUrl} alt="" fill sizes="85px" />
          </span>
        ))}
        {previewImages.length === NO_ITEMS && (
          <span className="flex flex-1 items-center justify-center text-muted-foreground">
            <Shirt className="size-6" aria-hidden />
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-foreground">
          {outfit.title ?? tBoard("untitled")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("summary", {
            count: itemCount,
            total: tBudget("rupees", { amount: formatLakhAmount(outfit.total) }),
          })}
        </p>
        {itemCount > NO_ITEMS && (
          <p className="text-xs text-muted-foreground">
            {isFullyAvailable ? tBudget("fullyAvailable") : tBudget("someUnavailable")}
          </p>
        )}
      </div>
    </Link>
  );
};

export const BuildCardMessage = ({ message }: { message: Message }) => {
  const t = useTranslations("outfitBuild.card");
  if (!message.outfitId) return null;

  return (
    <div
      className={
        message.isMine ? "flex flex-col items-end gap-1" : "flex flex-col items-start gap-1"
      }
    >
      <p className="text-xs text-muted-foreground">
        {message.isMine ? t("youStarted") : t("startedBy", { name: message.sender.name })}
      </p>
      <BuildCardBody outfitId={message.outfitId} />
    </div>
  );
};
