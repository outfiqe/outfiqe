import type { OutfitPlacementRefusal } from "@outfiqe/utils";

import { HTTP_STATUS } from "#constants/http.constants.js";
import type { OutfitStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

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
  notFound: () => new AppError("OUTFIT_NOT_FOUND", "Build not found.", HTTP_STATUS.NOT_FOUND),

  notOwner: () =>
    new AppError("NOT_OUTFIT_OWNER", "Only the build's owner can do that.", HTTP_STATUS.FORBIDDEN),

  versionRequired: () =>
    new AppError(
      "OUTFIT_VERSION_REQUIRED",
      "Send the version of the build you last saw in an X-Outfit-Version header.",
      HTTP_STATUS.PRECONDITION_REQUIRED,
    ),

  versionMalformed: () =>
    new AppError(
      "OUTFIT_VERSION_MALFORMED",
      "The X-Outfit-Version header must be the build's version number.",
      HTTP_STATUS.BAD_REQUEST,
    ),

  versionConflict: (currentVersion: number | null) =>
    new AppError(
      "OUTFIT_VERSION_CONFLICT",
      "Someone else changed this build. Showing the latest version.",
      HTTP_STATUS.CONFLICT,
      { currentVersion },
    ),

  notEditable: (status: OutfitStatus) =>
    new AppError(
      "OUTFIT_NOT_EDITABLE",
      "This build can't be changed in its current state.",
      HTTP_STATUS.CONFLICT,
      { status },
    ),

  placementRefused: (refusal: OutfitPlacementRefusal) =>
    new AppError(refusal, PLACEMENT_REFUSAL_MESSAGES[refusal], HTTP_STATUS.UNPROCESSABLE_ENTITY),

  productUnavailable: () =>
    new AppError(
      "PRODUCT_UNAVAILABLE",
      "That product can't be added. It may be sold out or no longer on sale.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  itemNotFound: () =>
    new AppError("ITEM_NOT_FOUND", "There's no item in that spot.", HTTP_STATUS.NOT_FOUND),

  reorderMismatch: () =>
    new AppError(
      "REORDER_MISMATCH",
      "List every item in the slot exactly once to reorder it.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  noSlotTypes: () =>
    new AppError(
      "NO_SLOT_TYPES",
      "Builds can't be started until an admin sets up outfit slots.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  tooManyBuildsInChat: (maxBoardsPerChat: number) =>
    new AppError(
      "TOO_MANY_BUILDS_IN_CHAT",
      `A chat can have at most ${maxBoardsPerChat} builds in progress.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  conversationNotFound: () =>
    new AppError("CONVERSATION_NOT_FOUND", "Chat not found.", HTTP_STATUS.NOT_FOUND),

  notEnoughItems: (minItemsToLock: number) =>
    new AppError(
      "NOT_ENOUGH_ITEMS",
      `Add at least ${minItemsToLock} items before locking the build.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  itemsSoldOut: (soldOutProductIds: string[]) =>
    new AppError(
      "ITEMS_SOLD_OUT",
      "Swap the sold-out items before locking the build.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      { soldOutProductIds },
    ),

  notEveryoneHappy: () =>
    new AppError(
      "NOT_EVERYONE_HAPPY",
      "Everyone on the build needs to tap I'm happy before it can be locked.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  tooManyEditors: (maxEditorsPerBoard: number) =>
    new AppError(
      "TOO_MANY_EDITORS",
      `A build can have at most ${maxEditorsPerBoard} people, including its owner.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  peopleUnavailable: (unavailableUserIds: string[]) =>
    new AppError(
      "PEOPLE_UNAVAILABLE",
      "Some of these people can't be added right now.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      { unavailableUserIds },
    ),

  alreadyOnBuild: () =>
    new AppError(
      "ALREADY_ON_BUILD",
      "Everyone you picked is already on this build.",
      HTTP_STATUS.CONFLICT,
    ),

  memberNotFound: () =>
    new AppError("MEMBER_NOT_FOUND", "That person isn't on this build.", HTTP_STATUS.NOT_FOUND),

  ownerMustHandOver: () =>
    new AppError(
      "OWNER_MUST_HAND_OVER",
      "Hand the build over to another editor before leaving it.",
      HTTP_STATUS.CONFLICT,
    ),

  openOfferBlocksLeave: () =>
    new AppError(
      "OPEN_OFFER_BLOCKS_LEAVE",
      "You've still got an offer open on this build. Settle it first (accept and post, or decline), then you're free to leave.",
      HTTP_STATUS.CONFLICT,
    ),

  neverLocked: () =>
    new AppError(
      "OUTFIT_NEVER_LOCKED",
      "Lock the build before sharing it or making it public.",
      HTTP_STATUS.CONFLICT,
    ),

  publicFeedUnavailable: () =>
    new AppError(
      "FEATURE_NOT_AVAILABLE",
      "Public builds aren't available yet.",
      HTTP_STATUS.NOT_FOUND,
    ),

  shareNotFound: () =>
    new AppError(
      "SHARE_NOT_FOUND",
      "This build wasn't sent to that person.",
      HTTP_STATUS.NOT_FOUND,
    ),

  commentNotFound: () =>
    new AppError("COMMENT_NOT_FOUND", "This chime no longer exists.", HTTP_STATUS.NOT_FOUND),

  replyToReply: () =>
    new AppError(
      "COMMENT_NOT_TOP_LEVEL",
      "You can only reply to a top-level chime.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  notLocked: () =>
    new AppError(
      "OUTFIT_NOT_LOCKED",
      "Lock the build before posting it as a look.",
      HTTP_STATUS.CONFLICT,
    ),

  sizesWornMismatch: () =>
    new AppError(
      "SIZES_WORN_MISMATCH",
      "Give a size for each item in the locked build, and only those items.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  photosUnavailable: () =>
    new AppError(
      "FEATURE_NOT_AVAILABLE",
      "Build photos aren't available yet.",
      HTTP_STATUS.NOT_FOUND,
    ),

  tryOnUnavailable: () =>
    new AppError(
      "FEATURE_NOT_AVAILABLE",
      "Try-on photos aren't available yet.",
      HTTP_STATUS.NOT_FOUND,
    ),

  photoNotFound: () =>
    new AppError("PHOTO_NOT_FOUND", "That photo isn't on this build.", HTTP_STATUS.NOT_FOUND),

  photoAlreadyAdded: () =>
    new AppError("PHOTO_ALREADY_ADDED", "That photo is already on a build.", HTTP_STATUS.CONFLICT),

  memberPhotoLimitReached: (maxPhotosPerMember: number) =>
    new AppError(
      "MEMBER_PHOTO_LIMIT_REACHED",
      `You can add at most ${maxPhotosPerMember} photos to one build.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  boardPhotoLimitReached: (maxPhotosPerBoard: number) =>
    new AppError(
      "BOARD_PHOTO_LIMIT_REACHED",
      `A build can hold at most ${maxPhotosPerBoard} photos.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  notPhotoUploader: () =>
    new AppError(
      "NOT_PHOTO_UPLOADER",
      "Only the person who added a photo, or the build's owner, can remove it.",
      HTTP_STATUS.FORBIDDEN,
    ),

  tooManyCovers: (maxCoverPhotos: number) =>
    new AppError(
      "TOO_MANY_COVERS",
      `Pick at most ${maxCoverPhotos} cover photos.`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  coverNotEligible: () =>
    new AppError(
      "COVER_NOT_ELIGIBLE",
      "Only build photos on this build can be covers. Try-on photos can't.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  lookFromVersionDeleted: () =>
    new AppError(
      "LOOK_FROM_VERSION_DELETED",
      "You deleted the look you made from this version. Lock a new version to drop it again.",
      HTTP_STATUS.CONFLICT,
    ),
};
