import { Badge } from "@outfiqe/design-system";
import { ChevronRight } from "lucide-react";

import type { MetricTag } from "../api/tagReviewsSchemas";
import { describeTagOutcome, toStatusDisplay } from "../utils/metricTagOutcome.utils";
import { formatDuration } from "../utils/tagReviewMetrics.utils";

const describeTiming = ({ reviewStatus, waitHours, hoursToGoLive }: MetricTag): string => {
  if (reviewStatus === "PENDING") return `Waiting ${formatDuration(waitHours)}`;
  if (hoursToGoLive !== null) return `Live after ${formatDuration(hoursToGoLive)}`;
  return `Answered after ${formatDuration(waitHours)}`;
};

export const MetricTagRow = ({ tag, onOpen }: { tag: MetricTag; onOpen: () => void }) => {
  const { label: statusLabel, tone: statusTone } = toStatusDisplay(tag);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={tag.look.imageUrl}
        alt=""
        loading="lazy"
        className="size-16 shrink-0 rounded-lg bg-muted object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {tag.product.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {tag.brand.name} · tagged by @{tag.creator.handle}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {describeTagOutcome(tag)} · {describeTiming(tag)}
        </span>
      </span>
      <Badge showDot={false} tone={statusTone}>
        {statusLabel}
      </Badge>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
};
