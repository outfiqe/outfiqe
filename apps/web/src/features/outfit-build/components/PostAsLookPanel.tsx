"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useAuth } from "@/features/auth";
import { lookPermalinkPath } from "@/features/explore/posts/utils/lookPermalink";

import type { OutfitBoard } from "../api/outfitSchemas";
import { useMyBuildLook } from "../hooks/useBuildLook";
import { PublishLookModal } from "./PublishLookModal";

export const PostAsLookPanel = ({ board }: { board: OutfitBoard }) => {
  const t = useTranslations("outfitBuild.publish");
  const { state, isCreator } = useAuth();
  const [isPosting, setIsPosting] = useState(false);
  const canPost = isCreator && board.myRole !== "VIEWER" && board.status === "LOCKED";
  const { data: myLook, isPending, isError } = useMyBuildLook(board.id, canPost);

  if (!canPost) return null;

  const handle = state.user?.handle;
  const hasCurrentLook = myLook !== null && myLook !== undefined && !myLook.isOutdated;

  return (
    <section
      aria-labelledby="post-as-look-title"
      className="space-y-2 rounded-xl border border-border bg-card p-4"
    >
      <h2 id="post-as-look-title" className="text-sm font-semibold text-foreground">
        {t("panelTitle")}
      </h2>
      {isPending && <Skeleton className="h-9 w-40 rounded-lg" />}
      {isError && <p className="text-sm text-muted-foreground">{t("statusFailed")}</p>}
      {!isPending && myLook?.isOutdated && (
        <p className="text-sm text-muted-foreground">{t("newVersionAvailable")}</p>
      )}
      {!isPending && hasCurrentLook && (
        <p className="text-sm text-muted-foreground">
          {t("alreadyPosted")}{" "}
          {handle && (
            <Link
              href={lookPermalinkPath(handle, myLook.lookId)}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {t("viewLook")}
            </Link>
          )}
        </p>
      )}
      {!isPending && !hasCurrentLook && (
        <Button onClick={() => setIsPosting(true)}>
          {myLook?.isOutdated ? t("postNewVersion") : t("postAsLook")}
        </Button>
      )}
      {isPosting && (
        <PublishLookModal
          board={board}
          onPublished={() => setIsPosting(false)}
          onClose={() => setIsPosting(false)}
        />
      )}
    </section>
  );
};
