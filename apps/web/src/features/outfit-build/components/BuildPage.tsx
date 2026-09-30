"use client";

import { Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useOutfit } from "../hooks/useOutfit";
import { useOutfitLiveSync } from "../hooks/useOutfitLiveSync";
import { BuildBoard } from "./BuildBoard";
import { PublishedBuildView } from "./PublishedBuildView";

const SKELETON_SLOT_COUNT = 6;
const MY_BUILDS_PATH = "/builds";

export const BuildPage = ({ outfitId }: { outfitId: string }) => {
  const t = useTranslations("outfitBuild.board");
  const { data: outfit, isLoading, isError } = useOutfit(outfitId);
  const { isReconnecting, wasRemoved } = useOutfitLiveSync(outfitId, outfit?.kind === "board");

  if (isLoading) {
    return (
      <div aria-busy className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: SKELETON_SLOT_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !outfit) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">
          {wasRemoved ? t("removedTitle") : t("unavailableTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("unavailableBody")}</p>
        <Link
          href={MY_BUILDS_PATH}
          className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4"
        >
          {t("backToMyBuilds")}
        </Link>
      </div>
    );
  }

  return outfit.kind === "board" ? (
    <BuildBoard board={outfit} isReconnecting={isReconnecting} />
  ) : (
    <PublishedBuildView build={outfit} />
  );
};
