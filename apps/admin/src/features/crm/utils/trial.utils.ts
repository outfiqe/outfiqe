import { formatDate } from "@outfiqe/utils";

export const toTrialLabel = (trialEndsAt: string, now = new Date()): string =>
  new Date(trialEndsAt) < now
    ? `trial ended ${formatDate(trialEndsAt)}`
    : `trial ends ${formatDate(trialEndsAt)}`;
