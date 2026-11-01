import { Badge } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { VIEW_METRICS_PERMISSION } from "@/features/platform-metrics/constants/tenantMetrics.constants";
import {
  toLastUsedLabel,
  toPlanLabel,
  toSubscriptionLabel,
} from "@/features/platform-metrics/utils/tenantMetrics.utils";

import type { OrganizationListItem } from "../api/organizationsSchemas";

const CARD_CLASS_NAME =
  "flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4";
const SINGLE_MEMBER = 1;

const toMemberLabel = (memberCount: number) =>
  `${memberCount.toLocaleString()} ${memberCount === SINGLE_MEMBER ? "member" : "members"}`;

const OrganizationSummary = ({ organization }: { organization: OrganizationListItem }) => {
  const { name, subdomain, plan, subscriptionStatus, linkedBrandName, ownerName } = organization;
  const { memberCount, lastCrmActivityAt } = organization;
  const statusLabel = toSubscriptionLabel(subscriptionStatus);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-base font-bold text-foreground">{name}</h2>
        <Badge tone="neutral" showDot={false}>
          {toPlanLabel(plan)}
        </Badge>
        {statusLabel && (
          <Badge tone="neutral" showDot={false}>
            {statusLabel}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {subdomain} · {linkedBrandName ? `Brand: ${linkedBrandName}` : "No linked brand"} ·{" "}
        {ownerName ? `Owner: ${ownerName}` : "Owner hasn't accepted yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {toMemberLabel(memberCount)} · Last used: {toLastUsedLabel(lastCrmActivityAt)}
      </p>
    </div>
  );
};

export const OrganizationCard = ({ organization }: { organization: OrganizationListItem }) => {
  const { canUse } = usePlatformPermissions();

  if (!canUse(VIEW_METRICS_PERMISSION)) {
    return (
      <div className={CARD_CLASS_NAME}>
        <OrganizationSummary organization={organization} />
      </div>
    );
  }

  return (
    <Link
      to="/platform/metrics/$orgId"
      params={{ orgId: organization.id }}
      className={`${CARD_CLASS_NAME} cursor-pointer transition-colors hover:border-foreground/30`}
    >
      <OrganizationSummary organization={organization} />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
};
