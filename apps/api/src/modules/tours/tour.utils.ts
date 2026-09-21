import type { TourKey } from "@outfiqe/types";

import { KNOWN_TOUR_KEYS } from "./tour.constants.js";

const KNOWN_TOUR_KEY_SET: ReadonlySet<string> = new Set(KNOWN_TOUR_KEYS);

export const isKnownTourKey = (candidateKey: string): candidateKey is TourKey =>
  KNOWN_TOUR_KEY_SET.has(candidateKey);
