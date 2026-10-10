import { Badge, Button, toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { getErrorMessage } from "@/lib/errorMessages";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { type AdminOfferAction, type OfferFilter, offersApi } from "./api";
import { ADMIN_OFFERS_QUERY_KEY, useInfiniteOffers } from "./hooks/useInfiniteOffers";
import type { AdminOffer } from "./schemas";

const SKELETON_ROW_COUNT = 3;
const NO_OFFERS = 0;

type OfferTab = { label: string; filter: OfferFilter };

const WAITING_ON_CREATOR_TAB: OfferTab = {
  label: "Waiting on muse",
  filter: { kind: "status", status: "AWAITING_RESPONSE" },
};

const FILTER_TABS: OfferTab[] = [
  WAITING_ON_CREATOR_TAB,
  { label: "Accepted", filter: { kind: "status", status: "ACCEPTED" } },
  { label: "Dropped", filter: { kind: "status", status: "POSTED" } },
  { label: "Released", filter: { kind: "status", status: "RELEASED" } },
  { label: "Needs manual refund", filter: { kind: "refund", refundStatus: "NEEDS_MANUAL_REFUND" } },
];

const ACTION_COPY: Record<AdminOfferAction, { button: string; title: string; label: string }> = {
  release: {
    button: "Release to muse",
    title: "Release offer to the muse",
    label: "Why are you releasing this offer?",
  },
  refund: {
    button: "Refund brand",
    title: "Refund the brand",
    label: "Why are you refunding this offer?",
  },
  "mark-refunded": {
    button: "Mark refunded",
    title: "Record a manual refund",
    label: "How was the brand refunded? (reference)",
  },
};

const actionsFor = ({ status, refundStatus }: AdminOffer): AdminOfferAction[] => {
  if (refundStatus === "NEEDS_MANUAL_REFUND") return ["mark-refunded"];
  if (status === "ACCEPTED" || status === "POSTED") return ["release", "refund"];
  if (status === "AWAITING_RESPONSE") return ["refund"];
  return [];
};

export const OffersSection = () => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.COMMISSIONS);
  const [activeTab, setActiveTab] = useState<OfferTab>(WAITING_ON_CREATOR_TAB);
  const [pendingAction, setPendingAction] = useState<{
    offerId: string;
    action: AdminOfferAction;
  } | null>(null);
  const { data, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteOffers(activeTab.filter);
  const offers = data?.pages.flatMap((page) => page.items) ?? [];

  const act = useApiMutation({
    successMessage: "Offer updated.",
    mutationFn: ({
      offerId,
      action,
      reason,
    }: {
      offerId: string;
      action: AdminOfferAction;
      reason: string;
    }) => offersApi.act(offerId, action, reason),
    invalidateKeys: [[ADMIN_OFFERS_QUERY_KEY]],
    onSuccess: () => setPendingAction(null),
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const pendingCopy = pendingAction ? ACTION_COPY[pendingAction.action] : null;

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Build offers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Money brands paid to muses for dropping a build. Release or refund by hand when there is a
        dispute; every action is audited.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading &&
          Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <CardRowSkeleton key={index} textLineCount={2} />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load offers.</p>}
        {!isLoading && !error && offers.length === NO_OFFERS && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {offers.map((offer) => {
          const { id, brand, creator, amount, paymentMethod, status, outfitTitle, createdAt } =
            offer;
          return (
            <div
              key={id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {brand.name} → {creator.name}
                  </h3>
                  <Badge tone="neutral" showDot={false}>
                    {status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {outfitTitle ?? "Untitled build"} · {paymentMethod}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rs. {amount.toLocaleString()} · {new Date(createdAt).toLocaleDateString()}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  {actionsFor(offer).map((action) => (
                    <Button
                      key={action}
                      size="sm"
                      variant={action === "refund" ? "outline" : "default"}
                      disabled={act.isPending}
                      onClick={() => setPendingAction({ offerId: id, action })}
                    >
                      {ACTION_COPY[action].button}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
          >
            Load more
          </Button>
        )}
      </div>

      <TextPromptModal
        open={pendingAction !== null}
        title={pendingCopy?.title ?? ""}
        label={pendingCopy?.label ?? ""}
        confirmLabel={pendingCopy?.button ?? ""}
        pendingLabel="Saving…"
        isPending={act.isPending}
        onConfirm={(reason) => {
          if (pendingAction) act.mutate({ ...pendingAction, reason });
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
};
