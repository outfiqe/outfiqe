import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useInfiniteQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmAuditApi } from "./auditApi";
import type { CrmAuditEntry } from "./auditSchemas";
import { formatDateTime } from "./format.utils";

const AUDIT_QUERY_KEY = ["crm-audit"];

const ACTION_LABELS: Record<string, string> = {
  INVITE_SENT: "Invite sent",
  INVITE_REVOKED: "Invite revoked",
  INVITE_ACCEPTED: "Invite accepted",
  MEMBER_ROLE_CHANGED: "Member role changed",
  MEMBER_STATUS_CHANGED: "Member status changed",
  ROLE_CREATED: "Role created",
  ROLE_UPDATED: "Role updated",
  ROLE_DELETED: "Role deleted",
  ORGANIZATION_RENAMED: "Organization renamed",
  OWNERSHIP_TRANSFER_REQUESTED: "Ownership transfer requested",
  OWNERSHIP_TRANSFER_ACCEPTED: "Ownership transfer accepted",
  OWNERSHIP_TRANSFER_DECLINED: "Ownership transfer declined",
  OWNERSHIP_TRANSFER_REVOKED: "Ownership transfer revoked",
  SUBSCRIPTION_CHECKOUT_STARTED: "Checkout started",
  SUBSCRIPTION_ACTIVATED: "Subscription activated",
  SUBSCRIPTION_CANCELED: "Subscription cancelled",
};

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action.replace(/_/g, " ");

const AuditRow = ({ entry }: { entry: CrmAuditEntry }) => (
  <tr className="border-t border-border align-top">
    <td className="whitespace-nowrap py-2 pr-4 text-muted-foreground">
      {formatDateTime(entry.createdAt)}
    </td>
    <td className="py-2 pr-4">{entry.actorName ?? "System"}</td>
    <td className="py-2 pr-4">
      <span className="flex items-center gap-2">
        {actionLabel(entry.action)}
        {entry.outcome === "FAILURE" && <Badge tone="negative">failed</Badge>}
      </span>
    </td>
    <td className="py-2 text-muted-foreground">{entry.summary}</td>
  </tr>
);

export const AuditPage = () => {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: AUDIT_QUERY_KEY,
      queryFn: ({ pageParam }) => crmAuditApi.list(pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  const entries = data?.pages.flatMap((page) => page.entries) ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every membership, role, ownership and billing change on this organization.
      </p>

      <div className="mt-6">
        {isLoading && <Skeleton className="h-48 w-full" />}
        {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}

        {data && entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        )}

        {entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Who</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
};
