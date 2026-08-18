"use client";

import { Button, Skeleton, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { CreatorStatus } from "@/features/auth/types";
import type { PublicProduct } from "@/features/products/api/productSchemas";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { CreatorLink } from "../api/creatorLinksSchemas";
import { useCreateInternalLink, useGetOrCreateExternalLink } from "../hooks/useCreateCreatorLink";
import { useMyCreatorLinks } from "../hooks/useMyCreatorLinks";
import { CreatorStatusGate } from "./CreatorStatusGate";
import { ShareLinkRow } from "./ShareLinkRow";
import { ShareProductPicker } from "./ShareProductPicker";

const LINK_TYPE_LABEL = {
  INTERNAL_SINGLE_USE: "one-time link",
  EXTERNAL_REUSABLE: "reusable link",
};

type ShareSectionProps = {
  creatorStatus: CreatorStatus;
};

export const ShareSection = ({ creatorStatus }: ShareSectionProps) => {
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [newLink, setNewLink] = useState<CreatorLink | null>(null);

  const selectProduct = (product: PublicProduct | null) => {
    setSelectedProduct(product);
    setNewLink(null);
  };

  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyCreatorLinks();
  const links = data?.pages.flatMap((page) => page.items) ?? [];

  const createInternal = useCreateInternalLink();
  const getOrCreateExternal = useGetOrCreateExternalLink();
  const profileLink = useGetOrCreateExternalLink();

  if (creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <CreatorStatusGate
        creatorStatus={creatorStatus}
        pitch="Approved creators get their own share links and earn commission when someone buys through them."
      />
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Share &amp; earn</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Share a product link — you earn commission when someone buys through it.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-bold text-foreground">Your profile link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          A reusable link to your profile — put it in your Instagram or TikTok bio.
        </p>
        <div className="mt-3">
          {profileLink.data ? (
            <ShareLinkRow label="Profile link" url={profileLink.data.shareUrl} />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                profileLink.mutate(undefined, {
                  onError: (error) => toast.error(getErrorMessage(error)),
                })
              }
              disabled={profileLink.isPending}
            >
              {profileLink.isPending ? "Getting your link…" : "Get my profile link"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-bold text-foreground">Share a product</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          A one-time link dies after its first click — good for sending to one person. A reusable
          link works for posting anywhere and can be clicked as many times as you like.
        </p>

        <div className="mt-3">
          <ShareProductPicker selectedProduct={selectedProduct} onSelect={selectProduct} />
        </div>

        {selectedProduct && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() =>
                createInternal.mutate(selectedProduct.id, {
                  onSuccess: (link) => {
                    setNewLink(link);
                    toast.success("One-time link created");
                  },
                  onError: (error) => toast.error(getErrorMessage(error)),
                })
              }
              disabled={createInternal.isPending || getOrCreateExternal.isPending}
            >
              {createInternal.isPending ? "Generating…" : "Generate one-time link"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                getOrCreateExternal.mutate(selectedProduct.id, {
                  onSuccess: (link) => {
                    setNewLink(link);
                    toast.success("Reusable link ready");
                  },
                  onError: (error) => toast.error(getErrorMessage(error)),
                })
              }
              disabled={createInternal.isPending || getOrCreateExternal.isPending}
            >
              {getOrCreateExternal.isPending ? "Getting link…" : "Get reusable link"}
            </Button>
          </div>
        )}

        {newLink && (
          <div className="mt-3">
            <ShareLinkRow label="New link" url={newLink.shareUrl} />
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-display text-lg font-bold text-foreground">Your links</h2>

        {isPending && (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isPending && links.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            No links generated yet — share a product above to get started.
          </p>
        )}

        {links.length > 0 && (
          <div className="mt-3 space-y-2">
            {links.map((link) => (
              <ShareLinkRow
                key={link.id}
                label={link.productName ?? "Your profile"}
                url={link.shareUrl}
                meta={`${LINK_TYPE_LABEL[link.type]} · ${link.clickCount} click${link.clickCount === 1 ? "" : "s"}${link.status !== "ACTIVE" ? ` · ${link.status.toLowerCase()}` : ""}`}
              />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
