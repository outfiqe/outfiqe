import type { PlatformNavKey } from "@outfiqe/utils";

export type CoFounderSummary = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
};

export type NavAccessResolution = {
  isCoFounder: boolean;
  hiddenNavKeys: PlatformNavKey[];
};

export type NavAccessOverview = NavAccessResolution & {
  coFounders: CoFounderSummary[];
};

export type CoFounderContext = {
  userId: string;
  platformOrganizationId: string;
  membershipId: string;
};
