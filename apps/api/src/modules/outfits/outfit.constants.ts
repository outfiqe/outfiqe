import { minutesToMilliseconds } from "date-fns/minutesToMilliseconds";

export const OUTFIT_IDEMPOTENCY_ENDPOINT = {
  CREATE: "outfits:create",
  PLACE_ITEM: "outfits:place-item",
  REMOVE_ITEM: "outfits:remove-item",
  REORDER_SLOT: "outfits:reorder-slot",
  UPDATE_SETTINGS: "outfits:update-settings",
  SET_HAPPY: "outfits:set-happy",
  LOCK: "outfits:lock",
  UNLOCK: "outfits:unlock",
  ARCHIVE: "outfits:archive",
  ADD_EDITORS: "outfits:add-editors",
  REMOVE_EDITOR: "outfits:remove-editor",
  LEAVE: "outfits:leave",
  TRANSFER_OWNERSHIP: "outfits:transfer-ownership",
  SET_VISIBILITY: "outfits:set-visibility",
  REMOVE_SHARE: "outfits:remove-share",
  ADD_PHOTOS: "outfits:add-photos",
  REMOVE_PHOTO: "outfits:remove-photo",
  SET_COVERS: "outfits:set-covers",
} as const;

export const OUTFIT_PHOTO_CLEANUP = {
  UNCONFIRMED_MAX_AGE_HOURS: 24,
  SWEEP_INTERVAL_MS: minutesToMilliseconds(15),
  SWEEP_BATCH_SIZE: 200,
} as const;

export const OUTFIT_LIMITS = {
  TITLE_MAX_LENGTH: 80,
  BUDGET_MAX: 10_000_000,
  EDITORS_PER_REQUEST_MAX: 10,
  SHARES_PER_REQUEST_MAX: 50,
  EVENTS_PAGE_MAX: 100,
  LIST_DEFAULT_PAGE_SIZE: 20,
  LIST_MAX_PAGE_SIZE: 50,
  CARD_PREVIEW_PRODUCT_COUNT: 3,
  REPLACEMENT_SUGGESTIONS_MAX: 6,
} as const;

export const OUTFIT_RATE_LIMITS = {
  BOARD_EDITS: { windowMs: minutesToMilliseconds(1), max: 30 },
  BUILD_CREATION: { windowMs: minutesToMilliseconds(60), max: 20 },
  LOOK_PUBLISHES: { windowMs: minutesToMilliseconds(1), max: 10 },
  SOCIAL_REACTIONS: { windowMs: minutesToMilliseconds(1), max: 60 },
  COMMENTS: { windowMs: minutesToMilliseconds(1), max: 10 },
  CART_ADDS: { windowMs: minutesToMilliseconds(1), max: 20 },
  PHOTO_ADDS: { windowMs: minutesToMilliseconds(1), max: 10 },
} as const;

export const BUILD_ITEM_LEFT_OUT_REASON = {
  NOT_IN_BUILD: "NOT_IN_BUILD",
  NO_LONGER_SOLD: "NO_LONGER_SOLD",
  NO_SIZE_CHOSEN: "NO_SIZE_CHOSEN",
  SIZE_NOT_OFFERED: "SIZE_NOT_OFFERED",
  SOLD_OUT: "SOLD_OUT",
} as const;

export const OUTFIT_CHAT_FALLBACK_NAME = "Outfit build";

export const OUTFIT_VIEWER_ROLE = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

export const OUTFIT_ITEM_AVAILABILITY = {
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

export const OUTFIT_ETAG_PATTERN = /^(?:W\/)?"?(\d+)"?$/;
