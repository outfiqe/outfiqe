import { formatDate } from "@outfiqe/utils";

import { MetricRow, MetricSection } from "@/components/MetricParts";

import type { TenantMetricDetail } from "../api/platformMetricsSchemas";
import {
  toBrandPageUrl,
  toLastUsedLabel,
  toPlanLabel,
  toSubscriptionLabel,
} from "../utils/tenantMetrics.utils";

const NO_INVITES = 0;

const toRenewalLabel = ({ cancelAtPeriodEnd }: TenantMetricDetail) =>
  cancelAtPeriodEnd ? "Ends on" : "Renews on";

export const TenantAccountSection = ({ tenant }: { tenant: TenantMetricDetail }) => {
  const {
    ownerName,
    ownerEmail,
    linkedBrandId,
    linkedBrandName,
    plan,
    subscriptionStatus,
    trialEndsAt,
    currentPeriodEnd,
    seats,
    pendingInviteCount,
    createdAt,
    lastCrmActivityAt,
  } = tenant;

  return (
    <MetricSection title="Account" description="Who owns this CRM and where its plan stands.">
      <MetricRow
        label="Owner"
        detail={ownerEmail ?? undefined}
        value={ownerName ?? "Hasn't accepted yet"}
      />
      <MetricRow
        label="Brand"
        value={
          linkedBrandId ? (
            <a
              href={toBrandPageUrl(linkedBrandId)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {linkedBrandName ?? "Open brand"}
            </a>
          ) : (
            "No linked brand"
          )
        }
      />
      <MetricRow label="Plan" value={toPlanLabel(plan)} />
      <MetricRow
        label="Status"
        value={toSubscriptionLabel(subscriptionStatus) ?? "No subscription"}
      />
      {trialEndsAt && <MetricRow label="Trial ends" value={formatDate(trialEndsAt)} />}
      {currentPeriodEnd && (
        <MetricRow label={toRenewalLabel(tenant)} value={formatDate(currentPeriodEnd)} />
      )}
      {seats !== null && <MetricRow label="Seats" value={seats.toLocaleString()} />}
      {pendingInviteCount > NO_INVITES && (
        <MetricRow label="Invites waiting" value={pendingInviteCount.toLocaleString()} />
      )}
      <MetricRow label="Joined" value={formatDate(createdAt)} />
      <MetricRow label="Last used" value={toLastUsedLabel(lastCrmActivityAt)} />
    </MetricSection>
  );
};
