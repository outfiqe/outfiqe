import { type Request, type Response, Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { requireIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { requireFeatureFlag } from "#modules/feature-flags/feature-flags.middleware.js";

import { OUTFIT_RATE_LIMITS } from "./outfit.constants.js";
import { outfitController } from "./outfit.controller.js";
import {
  addBuildToCartSchema,
  addEditorsSchema,
  addOutfitCommentSchema,
  addOutfitPhotosSchema,
  createOutfitSchema,
  listOutfitsQuerySchema,
  outfitCommentParamSchema,
  outfitEventsQuerySchema,
  outfitIdParamSchema,
  outfitMemberParamSchema,
  outfitPhotoParamSchema,
  outfitSlotParamSchema,
  outfitSlotPositionParamSchema,
  placeItemSchema,
  publicBuildsQuerySchema,
  publishLookSchema,
  reorderSlotSchema,
  setHappySchema,
  setOutfitCoversSchema,
  setVisibilitySchema,
  transferOwnershipSchema,
  updateOutfitSettingsSchema,
} from "./outfit.schemas.js";
import { outfitSocialController } from "./outfit-social.controller.js";

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

const lookPublishRateLimit = rateLimit({
  namespace: "outfit-look-publishes",
  ...OUTFIT_RATE_LIMITS.LOOK_PUBLISHES,
  keyGenerator: perUserKey,
  message: "You're posting looks very quickly. Try again in a moment.",
});

const socialRateLimit = rateLimit({
  namespace: "outfit-social-reactions",
  ...OUTFIT_RATE_LIMITS.SOCIAL_REACTIONS,
  keyGenerator: perUserKey,
  message: "You're doing that very quickly. Wait a moment and try again.",
});

const commentRateLimit = rateLimit({
  namespace: "outfit-comments",
  ...OUTFIT_RATE_LIMITS.COMMENTS,
  keyGenerator: perUserKey,
  message: "You're commenting very quickly. Wait a moment and try again.",
});

const buildCartRateLimit = rateLimit({
  namespace: "outfit-cart-adds",
  ...OUTFIT_RATE_LIMITS.CART_ADDS,
  keyGenerator: perUserKey,
  message: "You're adding to your bag very quickly. Wait a moment and try again.",
});

const photoAddRateLimit = rateLimit({
  namespace: "outfit-photo-adds",
  ...OUTFIT_RATE_LIMITS.PHOTO_ADDS,
  keyGenerator: perUserKey,
  message: "You're adding photos very quickly. Wait a moment and try again.",
});

const outfitReadChain = [...requireActiveAuth, requireFeatureFlag("outfit_builder")];
const outfitWriteChain = [...outfitReadChain, requireIdempotencyKey, boardEditRateLimit];
const outfitPhotoWriteChain = [...outfitWriteChain, requireFeatureFlag("outfit_photos")];

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
  "/public",
  optionalAuth,
  requireFeatureFlag("outfit_public_feed"),
  validate({ query: publicBuildsQuerySchema }),
  outfitSocialController.listPublic,
);
outfitRoutes.get(
  "/saved",
  ...requireActiveAuth,
  validate({ query: listOutfitsQuerySchema }),
  outfitSocialController.listSaved,
);
outfitRoutes.get(
  "/:id/public",
  optionalAuth,
  validate({ params: outfitIdParamSchema }),
  outfitSocialController.getPublic,
);
outfitRoutes.put(
  "/:id/like",
  ...requireActiveAuth,
  socialRateLimit,
  validate({ params: outfitIdParamSchema }),
  outfitSocialController.like,
);
outfitRoutes.delete(
  "/:id/like",
  ...requireActiveAuth,
  socialRateLimit,
  validate({ params: outfitIdParamSchema }),
  outfitSocialController.unlike,
);
outfitRoutes.put(
  "/:id/save",
  ...requireActiveAuth,
  socialRateLimit,
  validate({ params: outfitIdParamSchema }),
  outfitSocialController.save,
);
outfitRoutes.delete(
  "/:id/save",
  ...requireActiveAuth,
  socialRateLimit,
  validate({ params: outfitIdParamSchema }),
  outfitSocialController.unsave,
);
outfitRoutes.get(
  "/:id/comments",
  optionalAuth,
  validate({ params: outfitIdParamSchema, query: listOutfitsQuerySchema }),
  outfitSocialController.listComments,
);
outfitRoutes.get(
  "/:id/comments/:commentId/replies",
  optionalAuth,
  validate({ params: outfitCommentParamSchema, query: listOutfitsQuerySchema }),
  outfitSocialController.listReplies,
);
outfitRoutes.post(
  "/:id/comments",
  ...requireActiveAuth,
  commentRateLimit,
  validate({ params: outfitIdParamSchema, body: addOutfitCommentSchema }),
  outfitSocialController.addComment,
);
outfitRoutes.delete(
  "/:id/comments/:commentId",
  ...requireActiveAuth,
  validate({ params: outfitCommentParamSchema }),
  outfitSocialController.removeComment,
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
  "/:id/look",
  ...outfitReadChain,
  validate({ params: outfitIdParamSchema }),
  outfitController.getMyLook,
);
outfitRoutes.post(
  "/:id/look",
  ...outfitReadChain,
  lookPublishRateLimit,
  validate({ params: outfitIdParamSchema, body: publishLookSchema }),
  outfitController.publishLook,
);
outfitRoutes.post(
  "/:id/cart",
  ...requireActiveAuth,
  requireRole(UserRole.CUSTOMER),
  buildCartRateLimit,
  validate({ params: outfitIdParamSchema, body: addBuildToCartSchema }),
  outfitController.addToCart,
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
outfitRoutes.post(
  "/:id/photos",
  ...outfitPhotoWriteChain,
  photoAddRateLimit,
  validate({ params: outfitIdParamSchema, body: addOutfitPhotosSchema }),
  outfitController.addPhotos,
);
outfitRoutes.delete(
  "/:id/photos/:photoId",
  ...outfitPhotoWriteChain,
  validate({ params: outfitPhotoParamSchema }),
  outfitController.removePhoto,
);
outfitRoutes.put(
  "/:id/covers",
  ...outfitPhotoWriteChain,
  validate({ params: outfitIdParamSchema, body: setOutfitCoversSchema }),
  outfitController.setCovers,
);
