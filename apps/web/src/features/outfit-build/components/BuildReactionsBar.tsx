"use client";

import { Button, cn } from "@outfiqe/design-system";
import { Bookmark, Heart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useAuth } from "@/features/auth";

import type { PublicBuildCard } from "../api/outfitSocialSchemas";
import { useToggleBuildLike, useToggleBuildSave } from "../hooks/useBuildSocial";

export const BuildReactionsBar = ({ build }: { build: PublicBuildCard }) => {
  const t = useTranslations("outfitBuild.public");
  const { isAuthenticated } = useAuth();
  const toggleLike = useToggleBuildLike(build.id);
  const toggleSave = useToggleBuildSave(build.id);

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("likeCountLabel", { count: build.likeCount })} ·{" "}
        <Link
          href={`/login?redirect=${encodeURIComponent(`/builds/${build.id}`)}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {t("signInToReact")}
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={build.isLiked}
        onClick={() => toggleLike.mutate(!build.isLiked)}
      >
        <Heart
          className={cn("size-4", build.isLiked && "fill-current text-destructive")}
          aria-hidden
        />
        {build.isLiked ? t("liked") : t("like")}
        <span className="text-muted-foreground">{build.likeCount}</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={build.isSaved}
        onClick={() => toggleSave.mutate(!build.isSaved)}
      >
        <Bookmark className={cn("size-4", build.isSaved && "fill-current")} aria-hidden />
        {build.isSaved ? t("saved") : t("save")}
      </Button>
    </div>
  );
};
