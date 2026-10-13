"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ShareRecipientPage } from "../../api/outfitSchemas";
import { PersonAvatar } from "../../components/PersonAvatar";
import { shareRecipientsQueryKey } from "../../hooks/outfitQueryKeys";
import { useShareRecipients } from "../hooks/useShareRecipients";

const SKELETON_ROW_COUNT = 2;
const NO_RECIPIENTS = 0;

type ShareRecipientsListProps = {
  outfitId: string;
  onRemoveRecipient: (userId: string) => Promise<boolean>;
};

export const ShareRecipientsList = ({ outfitId, onRemoveRecipient }: ShareRecipientsListProps) => {
  const t = useTranslations("outfitBuild.visibility");
  const queryClient = useQueryClient();
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useShareRecipients(outfitId);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const recipients = data?.pages.flatMap((page: ShareRecipientPage) => page.items) ?? [];

  const stopSharingWith = async (userId: string) => {
    setRemovingUserId(userId);
    const isRemoved = await onRemoveRecipient(userId);
    if (isRemoved) {
      await queryClient.invalidateQueries({ queryKey: shareRecipientsQueryKey(outfitId) });
    }
    setRemovingUserId(null);
  };

  return (
    <section aria-labelledby="share-recipients-heading" className="mt-4 space-y-2">
      <h3 id="share-recipients-heading" className="text-sm font-medium text-foreground">
        {t("sentTo")}
      </h3>
      {isPending && (
        <div aria-busy className="space-y-2">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      )}
      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {t("recipientsLoadFailed")}
        </p>
      )}
      {!isPending && !isError && recipients.length === NO_RECIPIENTS && (
        <p className="text-sm text-muted-foreground">{t("notSentYet")}</p>
      )}
      {recipients.length > NO_RECIPIENTS && (
        <ul className="space-y-1.5">
          {recipients.map((recipient) => (
            <li key={recipient.id} className="flex items-center gap-2">
              <PersonAvatar person={recipient} className="size-7" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {recipient.name}
              </span>
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("stopSharingWith", { name: recipient.name })}
                isLoading={removingUserId === recipient.id}
                disabled={removingUserId !== null}
                onClick={() => void stopSharingWith(recipient.id)}
              >
                {t("stopSharing")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <Button
          size="sm"
          variant="outline"
          isLoading={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {t("showMoreRecipients")}
        </Button>
      )}
    </section>
  );
};
