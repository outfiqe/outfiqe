import { PLATFORM_NAV_KEYS } from "@outfiqe/utils";
import { z } from "zod";

export const setHiddenNavKeysBodySchema = z.object({
  hiddenNavKeys: z.array(z.enum(PLATFORM_NAV_KEYS)).max(PLATFORM_NAV_KEYS.length),
});

export const promoteCoFounderBodySchema = z.object({
  membershipId: z.uuid(),
});

export const coFounderParamsSchema = z.object({
  membershipId: z.uuid(),
});

export type SetHiddenNavKeysBody = z.infer<typeof setHiddenNavKeysBodySchema>;
export type PromoteCoFounderBody = z.infer<typeof promoteCoFounderBodySchema>;
export type CoFounderParams = z.infer<typeof coFounderParamsSchema>;
