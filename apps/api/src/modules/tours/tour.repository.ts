import type { TourKey, TourOutcome } from "@outfiqe/types";

import { prisma } from "#db/prisma.js";

import type { TourProgressView } from "./tour.types.js";
import { isKnownTourKey, KNOWN_TOUR_KEYS } from "./tour.utils.js";

const TOUR_PROGRESS_SELECT = {
  tourKey: true,
  version: true,
  outcome: true,
  updatedAt: true,
} as const;

export const tourRepository = {
  async findForUser(userId: string): Promise<TourProgressView[]> {
    const progressRows = await prisma.userTourProgress.findMany({
      where: { userId, tourKey: { in: KNOWN_TOUR_KEYS } },
      select: TOUR_PROGRESS_SELECT,
      orderBy: { tourKey: "asc" },
    });
    return progressRows.flatMap(({ tourKey, ...progress }) =>
      isKnownTourKey(tourKey) ? [{ tourKey, ...progress }] : [],
    );
  },

  async upsertForUser(
    userId: string,
    tourKey: TourKey,
    version: number,
    outcome: TourOutcome,
  ): Promise<TourProgressView> {
    const {
      version: savedVersion,
      outcome: savedOutcome,
      updatedAt,
    } = await prisma.userTourProgress.upsert({
      where: { userId_tourKey: { userId, tourKey } },
      create: { userId, tourKey, version, outcome },
      update: { version, outcome },
      select: TOUR_PROGRESS_SELECT,
    });
    return { tourKey, version: savedVersion, outcome: savedOutcome, updatedAt };
  },
};
