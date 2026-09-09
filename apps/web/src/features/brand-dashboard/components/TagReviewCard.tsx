"use client";

import { Badge, Button } from "@outfiqe/design-system";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AppImage } from "@/shared/components/AppImage";
import { formatRelativeTime } from "@/shared/lib/formatRelativeTime";

import type { TagReviewQueueItem } from "../api/tagReviewSchemas";

type TagReviewCardProps = {
  item: TagReviewQueueItem;
  isBusy: boolean;
  onApprove: (trustCreator: boolean) => void;
  onReject: () => void;
};

const APPROVAL_SOURCE_LABELS: Record<string, string> = {
  BRAND: "You approved this",
  POLICY_OPEN: "Auto-approved — your policy is open to all creators",
  TRUSTED_CREATOR: "Auto-approved — trusted creator",
  VERIFIED_BUYER: "Auto-approved — bought on Outfiqe",
  SLA: "Auto-approved — not reviewed within 7 days",
  GRANDFATHERED: "Already live before tag review launched",
};

export const TagReviewCard = ({ item, isBusy, onApprove, onReject }: TagReviewCardProps) => {
  const { creator, product, sizeWorn, reviewStatus } = item;
  const isPending = reviewStatus === "PENDING";

  return (
    <div className="flex gap-3 rounded-2xl border border-border p-3 sm:gap-4 sm:p-4">
      <Link
        href={`/creator/${creator.handle}?look=${item.lookId}`}
        prefetch={false}
        className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24"
      >
        <AppImage src={item.lookImageUrl} alt={`Look by ${creator.name}`} fill sizes="96px" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/creator/${creator.handle}`}
            prefetch={false}
            className="text-sm font-semibold text-foreground hover:underline"
          >
            {creator.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            @{creator.handle} · {formatRelativeTime(item.submittedAt)}
          </span>
        </div>

        <p className="truncate text-sm text-muted-foreground">
          Tagged <span className="font-medium text-foreground">{product.name}</span>
          {sizeWorn ? ` · size ${sizeWorn}` : ""}
        </p>

        {(item.isVerifiedBuyer || item.isTrustedCreator) && (
          <div className="flex flex-wrap gap-1.5">
            {item.isVerifiedBuyer && (
              <Badge showDot={false} className="gap-1 bg-green-100 text-green-800">
                <BadgeCheck className="size-3" />
                Bought this on Outfiqe
              </Badge>
            )}
            {item.isTrustedCreator && (
              <Badge showDot={false} variant="outline" className="gap-1">
                <ShieldCheck className="size-3" />
                Trusted creator
              </Badge>
            )}
          </div>
        )}

        {reviewStatus === "REJECTED" && item.rejectionNote && (
          <p className="text-xs text-muted-foreground">
            Your note: <span className="italic">“{item.rejectionNote}”</span>
          </p>
        )}
        {reviewStatus === "APPROVED" && item.approvalSource && (
          <p className="text-xs text-muted-foreground">
            {APPROVAL_SOURCE_LABELS[item.approvalSource] ?? "Approved"}
          </p>
        )}

        {isPending ? (
          <div className="mt-1 flex flex-wrap gap-2">
            <Button size="sm" disabled={isBusy} onClick={() => onApprove(false)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => onApprove(true)}
              title="Approve this tag and let this creator's future tags skip the queue"
            >
              Approve &amp; trust
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={onReject}
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
            >
              Decline
            </Button>
          </div>
        ) : reviewStatus === "APPROVED" ? (
          <div className="mt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={onReject}
              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
            >
              Remove tag
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
