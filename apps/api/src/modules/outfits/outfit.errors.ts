import type { OutfitPlacementRefusal } from "@outfiqe/utils";

import type { OutfitStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

const BAD_REQUEST_STATUS = 400;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const PRECONDITION_REQUIRED_STATUS = 428;

const PLACEMENT_REFUSAL_MESSAGES: Record<OutfitPlacementRefusal, string> = {
  UNKNOWN_SLOT: "This build doesn't have that slot.",
  SLOT_FULL: "That slot is already full.",
  WRONG_SLOT_FOR_PRODUCT: "That kind of product doesn't go in this slot.",
  SLOT_BLOCKED: "This slot can't be filled while another slot it clashes with is filled.",
  PRODUCT_ALREADY_ON_BOARD: "That product is already on this build.",
  BOARD_FULL: "This build already has as many items as it can hold.",
  MEMBER_ITEM_LIMIT_REACHED: "You've added as many items as the owner allows per person.",
};

export const outfitErrors = {
  notFound: () => new AppError("OUTFIT_NOT_FOUND", "Build not found.", NOT_FOUND_STATUS),

  notOwner: () =>
    new AppError("NOT_OUTFIT_OWNER", "Only the build's owner can do that.", FORBIDDEN_STATUS),

  versionRequired: () =>
    new AppError(
      "OUTFIT_VERSION_REQUIRED",
      "Send the version of the build you last saw in an X-Outfit-Version header.",
      PRECONDITION_REQUIRED_STATUS,
    ),

  versionMalformed: () =>
    new AppError(
      "OUTFIT_VERSION_MALFORMED",
      "The X-Outfit-Version header must be the build's version number.",
      BAD_REQUEST_STATUS,
    ),

  versionConflict: (currentVersion: number | null) =>
    new AppError(
      "OUTFIT_VERSION_CONFLICT",
      "Someone else changed this build. Showing the latest version.",
      CONFLICT_STATUS,
      { currentVersion },
    ),

  notEditable: (status: OutfitStatus) =>
    new AppError(
      "OUTFIT_NOT_EDITABLE",
      "This build can't be changed in its current state.",
      CONFLICT_STATUS,
      { status },
    ),

  placementRefused: (refusal: OutfitPlacementRefusal) =>
    new AppError(refusal, PLACEMENT_REFUSAL_MESSAGES[refusal], UNPROCESSABLE_STATUS),

  productUnavailable: () =>
    new AppError(
      "PRODUCT_UNAVAILABLE",
      "That product can't be added. It may be sold out or no longer on sale.",
      UNPROCESSABLE_STATUS,
    ),

  itemNotFound: () =>
    new AppError("ITEM_NOT_FOUND", "There's no item in that spot.", NOT_FOUND_STATUS),

  reorderMismatch: () =>
    new AppError(
      "REORDER_MISMATCH",
      "List every item in the slot exactly once to reorder it.",
      UNPROCESSABLE_STATUS,
    ),

  noSlotTypes: () =>
    new AppError(
      "NO_SLOT_TYPES",
      "Builds can't be started until an admin sets up outfit slots.",
      UNPROCESSABLE_STATUS,
    ),

  tooManyBuildsInChat: (maxBoardsPerChat: number) =>
    new AppError(
      "TOO_MANY_BUILDS_IN_CHAT",
      `A chat can have at most ${maxBoardsPerChat} builds in progress.`,
      UNPROCESSABLE_STATUS,
    ),

  conversationNotFound: () =>
    new AppError("CONVERSATION_NOT_FOUND", "Chat not found.", NOT_FOUND_STATUS),

  notEnoughItems: (minItemsToLock: number) =>
    new AppError(
      "NOT_ENOUGH_ITEMS",
      `Add at least ${minItemsToLock} items before locking the build.`,
      UNPROCESSABLE_STATUS,
    ),

  itemsSoldOut: (soldOutProductIds: string[]) =>
    new AppError(
      "ITEMS_SOLD_OUT",
      "Swap the sold-out items before locking the build.",
      UNPROCESSABLE_STATUS,
      { soldOutProductIds },
    ),

  notEveryoneHappy: () =>
    new AppError(
      "NOT_EVERYONE_HAPPY",
      "Everyone on the build needs to tap I'm happy before it can be locked.",
      UNPROCESSABLE_STATUS,
    ),

  tooManyEditors: (maxEditorsPerBoard: number) =>
    new AppError(
      "TOO_MANY_EDITORS",
      `A build can have at most ${maxEditorsPerBoard} people, including its owner.`,
      UNPROCESSABLE_STATUS,
    ),

  peopleUnavailable: (unavailableUserIds: string[]) =>
    new AppError(
      "PEOPLE_UNAVAILABLE",
      "Some of these people can't be added right now.",
      UNPROCESSABLE_STATUS,
      { unavailableUserIds },
    ),

  alreadyOnBuild: () =>
    new AppError(
      "ALREADY_ON_BUILD",
      "Everyone you picked is already on this build.",
      CONFLICT_STATUS,
    ),

  memberNotFound: () =>
    new AppError("MEMBER_NOT_FOUND", "That person isn't on this build.", NOT_FOUND_STATUS),

  ownerMustHandOver: () =>
    new AppError(
      "OWNER_MUST_HAND_OVER",
      "Hand the build over to another editor before leaving it.",
      CONFLICT_STATUS,
    ),

  openOfferBlocksLeave: () =>
    new AppError(
      "OPEN_OFFER_BLOCKS_LEAVE",
      "You've still got an offer open on this build. Settle it first (accept and post, or decline), then you're free to leave.",
      CONFLICT_STATUS,
    ),

  neverLocked: () =>
    new AppError(
      "OUTFIT_NEVER_LOCKED",
      "Lock the build before sharing it or making it public.",
      CONFLICT_STATUS,
    ),

  publicFeedUnavailable: () =>
    new AppError("FEATURE_NOT_AVAILABLE", "Public builds aren't available yet.", NOT_FOUND_STATUS),

  shareNotFound: () =>
    new AppError("SHARE_NOT_FOUND", "This build wasn't sent to that person.", NOT_FOUND_STATUS),

  commentNotFound: () =>
    new AppError("COMMENT_NOT_FOUND", "This chime no longer exists.", NOT_FOUND_STATUS),

  replyToReply: () =>
    new AppError(
      "COMMENT_NOT_TOP_LEVEL",
      "You can only reply to a top-level chime.",
      UNPROCESSABLE_STATUS,
    ),

  notLocked: () =>
    new AppError(
      "OUTFIT_NOT_LOCKED",
      "Lock the build before posting it as a look.",
      CONFLICT_STATUS,
    ),

  sizesWornMismatch: () =>
    new AppError(
      "SIZES_WORN_MISMATCH",
      "Give a size for each item in the locked build, and only those items.",
      UNPROCESSABLE_STATUS,
    ),

  photosUnavailable: () =>
    new AppError("FEATURE_NOT_AVAILABLE", "Build photos aren't available yet.", NOT_FOUND_STATUS),

  tryOnUnavailable: () =>
    new AppError("FEATURE_NOT_AVAILABLE", "Try-on photos aren't available yet.", NOT_FOUND_STATUS),

  photoNotFound: () =>
    new AppError("PHOTO_NOT_FOUND", "That photo isn't on this build.", NOT_FOUND_STATUS),

  photoAlreadyAdded: () =>
    new AppError("PHOTO_ALREADY_ADDED", "That photo is already on a build.", CONFLICT_STATUS),

  memberPhotoLimitReached: (maxPhotosPerMember: number) =>
    new AppError(
      "MEMBER_PHOTO_LIMIT_REACHED",
      `You can add at most ${maxPhotosPerMember} photos to one build.`,
      UNPROCESSABLE_STATUS,
    ),

  boardPhotoLimitReached: (maxPhotosPerBoard: number) =>
    new AppError(
      "BOARD_PHOTO_LIMIT_REACHED",
      `A build can hold at most ${maxPhotosPerBoard} photos.`,
      UNPROCESSABLE_STATUS,
    ),

  notPhotoUploader: () =>
    new AppError(
      "NOT_PHOTO_UPLOADER",
      "Only the person who added a photo, or the build's owner, can remove it.",
      FORBIDDEN_STATUS,
    ),

  tooManyCovers: (maxCoverPhotos: number) =>
    new AppError(
      "TOO_MANY_COVERS",
      `Pick at most ${maxCoverPhotos} cover photos.`,
      UNPROCESSABLE_STATUS,
    ),

  coverNotEligible: () =>
    new AppError(
      "COVER_NOT_ELIGIBLE",
      "Only build photos on this build can be covers. Try-on photos can't.",
      UNPROCESSABLE_STATUS,
    ),

  lookFromVersionDeleted: () =>
    new AppError(
      "LOOK_FROM_VERSION_DELETED",
      "You deleted the look you made from this version. Lock a new version to drop it again.",
      CONFLICT_STATUS,
    ),
};
