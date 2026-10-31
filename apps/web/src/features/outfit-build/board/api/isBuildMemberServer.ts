import "server-only";

import { cache } from "react";
import { z } from "zod";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

const BOARD_VIEW_KIND = "board";
const NOT_A_MEMBER = false;
const buildViewKindSchema = z.object({ kind: z.string() });

export const isBuildMemberServer = cache(
  async (outfitId: string, accessToken: string): Promise<boolean> => {
    try {
      const view = await serverApiRequest<unknown>(`/outfits/${outfitId}`, { accessToken });
      return buildViewKindSchema.parse(view).kind === BOARD_VIEW_KIND;
    } catch {
      return NOT_A_MEMBER;
    }
  },
);
