import { type Request, type Response, Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { requireIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validate } from "#middlewares/validate.js";
import { requireFeatureFlag } from "#modules/feature-flags/feature-flags.middleware.js";

import { OUTFIT_RATE_LIMITS } from "./outfit.constants.js";
import { outfitController } from "./outfit.controller.js";
import {
  addEditorsSchema,
  createOutfitSchema,
  listOutfitsQuerySchema,
  outfitEventsQuerySchema,
  outfitIdParamSchema,
  outfitMemberParamSchema,
  outfitSlotParamSchema,
  outfitSlotPositionParamSchema,
  placeItemSchema,
  reorderSlotSchema,
  setHappySchema,
  setVisibilitySchema,
  transferOwnershipSchema,
  updateOutfitSettingsSchema,
} from "./outfit.schemas.js";

const perUserKey = (_req: Request, res: Response) => getAuthPrincipal(res)?.userId;

const boardEditRateLimit = rateLimit({
  namespace: "outfit-board-edits",
  ...OUTFIT_RATE_LIMITS.BOARD_EDITS,
  keyGenerator: perUserKey,
  message: "You're changing builds very quickly. Wait a moment and try again.",
});

const buildCreationRateLimit = rateLimit({
  namespace: "outfit-creations",
  ...OUTFIT_RATE_LIMITS.BUILD_CREATION,
  keyGenerator: perUserKey,
  message: "You've started a lot of builds recently. Try again later.",
});

const outfitReadChain = [...requireActiveAuth, requireFeatureFlag("outfit_builder")];
const outfitWriteChain = [...outfitReadChain, requireIdempotencyKey, boardEditRateLimit];

export const outfitRoutes = Router();

outfitRoutes.get(
  "/",
  ...outfitReadChain,
  validate({ query: listOutfitsQuerySchema }),
  outfitController.listMine,
);
outfitRoutes.get(
  "/shared-with-me",
  ...outfitReadChain,
  validate({ query: listOutfitsQuerySchema }),
  outfitController.listSharedWithMe,
);
outfitRoutes.post(
  "/",
  ...outfitReadChain,
  requireIdempotencyKey,
  buildCreationRateLimit,
  validate({ body: createOutfitSchema }),
  outfitController.create,
);
outfitRoutes.get(
  "/:id",
  ...outfitReadChain,
  validate({ params: outfitIdParamSchema }),
  outfitController.get,
);
outfitRoutes.get(
  "/:id/events",
  ...outfitReadChain,
  validate({ params: outfitIdParamSchema, query: outfitEventsQuerySchema }),
  outfitController.listEvents,
);
outfitRoutes.get(
  "/:id/slots/:slotKey/positions/:position/replacements",
  ...outfitReadChain,
  validate({ params: outfitSlotPositionParamSchema }),
  outfitController.listReplacements,
);

outfitRoutes.put(
  "/:id/slots/:slotKey/positions/:position",
  ...outfitWriteChain,
  validate({ params: outfitSlotPositionParamSchema, body: placeItemSchema }),
  outfitController.placeItem,
);
outfitRoutes.delete(
  "/:id/slots/:slotKey/positions/:position",
  ...outfitWriteChain,
  validate({ params: outfitSlotPositionParamSchema }),
  outfitController.removeItem,
);
outfitRoutes.put(
  "/:id/slots/:slotKey/order",
  ...outfitWriteChain,
  validate({ params: outfitSlotParamSchema, body: reorderSlotSchema }),
  outfitController.reorderSlot,
);
outfitRoutes.patch(
  "/:id/settings",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema, body: updateOutfitSettingsSchema }),
  outfitController.updateSettings,
);
outfitRoutes.put(
  "/:id/happy",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema, body: setHappySchema }),
  outfitController.setHappy,
);
outfitRoutes.post(
  "/:id/lock",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema }),
  outfitController.lock,
);
outfitRoutes.post(
  "/:id/unlock",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema }),
  outfitController.unlock,
);
outfitRoutes.post(
  "/:id/archive",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema }),
  outfitController.archive,
);
outfitRoutes.post(
  "/:id/members",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema, body: addEditorsSchema }),
  outfitController.addEditors,
);
outfitRoutes.delete(
  "/:id/members/:userId",
  ...outfitWriteChain,
  validate({ params: outfitMemberParamSchema }),
  outfitController.removeEditor,
);
outfitRoutes.post(
  "/:id/leave",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema }),
  outfitController.leave,
);
outfitRoutes.post(
  "/:id/transfer-ownership",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema, body: transferOwnershipSchema }),
  outfitController.transferOwnership,
);
outfitRoutes.put(
  "/:id/visibility",
  ...outfitWriteChain,
  validate({ params: outfitIdParamSchema, body: setVisibilitySchema }),
  outfitController.setVisibility,
);
outfitRoutes.delete(
  "/:id/shares/:userId",
  ...outfitWriteChain,
  validate({ params: outfitMemberParamSchema }),
  outfitController.removeShare,
);
