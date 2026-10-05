import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { type OfferFilter, offersApi } from "../api";

export const ADMIN_OFFERS_QUERY_KEY = "admin-outfit-offers";

const filterKey = (filter: OfferFilter): string =>
  filter.kind === "status" ? filter.status : `refund:${filter.refundStatus}`;

export const useInfiniteOffers = (filter: OfferFilter) =>
  useInfiniteCursorPage([ADMIN_OFFERS_QUERY_KEY, filterKey(filter)], (cursor) =>
    offersApi.list(filter, cursor),
  );
