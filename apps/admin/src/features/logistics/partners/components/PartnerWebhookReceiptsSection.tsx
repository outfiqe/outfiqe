import { Badge, Button, FormBanner, Label, Select, Skeleton } from "@outfiqe/design-system";
import { useId, useState } from "react";

import type { WebhookReceipt } from "../api/partnersSchemas";
import {
  DEFAULT_REPLAY_WINDOW_DAYS,
  REPLAY_WINDOW_LABELS,
  REPLAY_WINDOWS_IN_DAYS,
} from "../constants/partnerLabels";
import { useInfinitePartnerWebhookReceipts } from "../hooks/useInfinitePartnerWebhookReceipts";
import { useReplayPartnerWebhookReceipts } from "../hooks/useReplayPartnerWebhookReceipts";

const NO_RECEIPTS = 0;
const NO_UNKNOWN_STATUSES = 0;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const describeReceipt = ({
  signatureValid,
  processedAt,
  processingError,
  eventCount,
  appliedCount,
  unknownCount,
}: WebhookReceipt) => {
  if (!signatureValid) return { tone: "negative" as const, label: "Turned away — check failed" };
  if (processingError) return { tone: "negative" as const, label: processingError };
  if (!processedAt) return { tone: "neutral" as const, label: "Waiting to be read" };
  if (unknownCount > NO_UNKNOWN_STATUSES) {
    return { tone: "negative" as const, label: `${unknownCount} with a status we don't know` };
  }
  return { tone: "positive" as const, label: `${appliedCount} of ${eventCount} applied` };
};

const sinceDaysAgo = (days: number) => new Date(Date.now() - days * DAY_IN_MS).toISOString();

type PartnerWebhookReceiptsSectionProps = { partnerId: string; canManage: boolean };

export const PartnerWebhookReceiptsSection = ({
  partnerId,
  canManage,
}: PartnerWebhookReceiptsSectionProps) => {
  const {
    data: receiptPages,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfinitePartnerWebhookReceipts(partnerId);
  const replayReceipts = useReplayPartnerWebhookReceipts(partnerId);
  const [replayWindowDays, setReplayWindowDays] = useState(DEFAULT_REPLAY_WINDOW_DAYS);
  const replayWindowId = useId();
  const receipts = receiptPages?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby="partner-receipts-heading" className="space-y-3">
      <h2 id="partner-receipts-heading" className="text-lg font-semibold text-foreground">
        Updates received
      </h2>
      <p className="text-sm text-muted-foreground">
        Every update the partner sent us. After adding a status word above, send the updates it
        missed through again.
      </p>

      {canManage && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor={replayWindowId}>Updates from</Label>
            <Select
              id={replayWindowId}
              value={String(replayWindowDays)}
              onChange={(event) => setReplayWindowDays(Number(event.target.value))}
            >
              {REPLAY_WINDOWS_IN_DAYS.map((days) => (
                <option key={days} value={days}>
                  {REPLAY_WINDOW_LABELS[days]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            isLoading={replayReceipts.isPending}
            onClick={() => replayReceipts.mutate(sinceDaysAgo(replayWindowDays))}
          >
            Send missed updates again
          </Button>
        </div>
      )}

      {isError && <FormBanner>We couldn&apos;t load this partner&apos;s updates.</FormBanner>}
      {isPending && (
        <div aria-busy="true" aria-label="Loading partner updates" className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      )}
      {!isPending && !isError && receipts.length === NO_RECEIPTS && (
        <p className="text-sm text-muted-foreground">No updates from this partner yet.</p>
      )}

      {receipts.length > NO_RECEIPTS && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {receipts.map((receipt) => {
            const { tone, label } = describeReceipt(receipt);
            return (
              <li
                key={receipt.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <span className="text-sm text-foreground">
                  {new Date(receipt.receivedAt).toLocaleString()}
                </span>
                <Badge tone={tone} showDot={false}>
                  {label}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}

      {hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void fetchNextPage()}
          isLoading={isFetchingNextPage}
        >
          Load more
        </Button>
      )}
    </section>
  );
};
