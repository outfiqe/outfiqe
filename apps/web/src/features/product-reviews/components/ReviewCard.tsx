"use client";

import { Rating } from "@outfiqe/design-system";
import { BadgeCheck, ThumbsUp } from "lucide-react";

import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import type { ProductReview } from "../api/productReviewSchemas";

type ReviewCardProps = {
  review: ProductReview;
  isOwn: boolean;
  canModerate: boolean;
  onToggleHelpful: () => void;
  isTogglingHelpful: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export const ReviewCard = ({
  review,
  isOwn,
  canModerate,
  onToggleHelpful,
  isTogglingHelpful,
  onEdit,
  onDelete,
}: ReviewCardProps) => {
  const { author, rating, title, body, images, helpfulCount, hasVotedHelpful, createdAt } = review;

  return (
    <article className="border-b border-border py-5 last:border-b-0">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-xs font-bold text-white"
          style={
            author.avatarUrl
              ? { backgroundImage: `url(${author.avatarUrl})` }
              : { backgroundColor: getAvatarColor(author.id) }
          }
        >
          {!author.avatarUrl && initialsFor(author.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">{author.name}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-strong">
              <BadgeCheck className="size-3.5" />
              Verified purchase
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Rating value={rating} readOnly size="sm" />
            <time dateTime={createdAt} className="text-[11px] text-muted-foreground">
              {new Date(createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          </div>

          {title && <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>}
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{body}</p>

          {images.length > 0 && (
            <div className="mt-3 flex gap-2">
              {images.map((url) => (
                <div
                  key={url}
                  className="aspect-square w-16 shrink-0 rounded-lg border border-border bg-cover bg-center"
                  style={{ backgroundImage: `url(${url})` }}
                />
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={onToggleHelpful}
              disabled={isOwn || isTogglingHelpful}
              aria-pressed={hasVotedHelpful}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                hasVotedHelpful && "text-primary-strong",
              )}
            >
              <ThumbsUp className={cn("size-3.5", hasVotedHelpful && "fill-primary-strong")} />
              Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ""}
            </button>

            {isOwn && (
              <button
                type="button"
                onClick={onEdit}
                className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Edit
              </button>
            )}
            {(isOwn || canModerate) && (
              <button
                type="button"
                onClick={onDelete}
                className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
