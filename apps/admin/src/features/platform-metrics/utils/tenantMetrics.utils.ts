import { formatDate } from "@outfiqe/utils";

import { NEVER_USED_LABEL, SUBSCRIPTION_STATUS_LABEL } from "../constants/tenantMetrics.constants";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
const SINGLE_COUNT = 1;
const FIRST_LETTER_INDEX = 0;
const AFTER_FIRST_LETTER = 1;

const toCountLabel = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count.toLocaleString()} ${count === SINGLE_COUNT ? singular : plural}`;

export const toPlanLabel = (plan: string): string =>
  plan.charAt(FIRST_LETTER_INDEX).toUpperCase() + plan.slice(AFTER_FIRST_LETTER);

export const toSubscriptionLabel = (status: string | null): string | null =>
  status ? (SUBSCRIPTION_STATUS_LABEL[status] ?? toPlanLabel(status.toLowerCase())) : null;

export const toLastUsedLabel = (lastCrmActivityAt: string | null): string =>
  lastCrmActivityAt ? formatDate(lastCrmActivityAt) : NEVER_USED_LABEL;

export const toTenantCountLabel = (count: number): string =>
  toCountLabel(count, "business", "businesses");

export const describeTenantUsage = ({
  name,
  memberCount,
  lastCrmActivityAt,
}: {
  name: string;
  memberCount: number;
  lastCrmActivityAt: string | null;
}): string => {
  const members = toCountLabel(memberCount, "member");
  return lastCrmActivityAt
    ? `${name} has ${members} and last used the CRM on ${formatDate(lastCrmActivityAt)}.`
    : `${name} has ${members} but hasn't used the CRM yet.`;
};

export const toTenantSiteUrl = (subdomain: string): string => {
  const { protocol, host } = new URL(WEB_URL);
  return `${protocol}//${subdomain}.${host}`;
};

export const toBrandPageUrl = (brandId: string): string => `${WEB_URL}/brand/${brandId}`;
