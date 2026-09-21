import { TourKey } from "@outfiqe/types";

export const KNOWN_TOUR_KEYS: string[] = Object.values(TourKey);

export const isKnownTourKey = (candidateKey: string): candidateKey is TourKey =>
  KNOWN_TOUR_KEYS.includes(candidateKey);
