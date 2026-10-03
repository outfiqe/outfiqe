import type { Request, Response } from "express";

import { ETAG_HEADER, IF_MATCH_HEADER } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { readRequiredIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validated } from "#middlewares/validate.js";

import { outfitErrors } from "./outfit.errors.js";
import type {
  AddEditorsBody,
  CreateOutfitBody,
  ListOutfitsQuery,
  OutfitEventsQuery,
  OutfitIdParam,
  OutfitMemberParam,
  OutfitSlotParam,
  OutfitSlotPositionParam,
  PlaceItemBody,
  PublishLookBody,
  ReorderSlotBody,
  SetHappyBody,
  SetVisibilityBody,
  TransferOwnershipBody,
  UpdateOutfitSettingsBody,
} from "./outfit.schemas.js";
import { outfitService } from "./outfit.service.js";
import { parseVersionHeader, toETag } from "./outfit.utils.js";
import type { OutfitWriteCall, OutfitWriteResult } from "./outfit.write.js";
import { outfitMemberService } from "./outfit-member.service.js";
import { outfitPublishService } from "./outfit-publish.service.js";
import { outfitReplacementService } from "./outfit-replacements.service.js";
import { outfitVisibilityService } from "./outfit-visibility.service.js";

const OK_STATUS = 200;
const CREATED_STATUS = 201;

const readExpectedVersion = (req: Request): number => {
  const headerValue = req.get(IF_MATCH_HEADER);
  if (!headerValue) throw outfitErrors.versionRequired();
  const expectedVersion = parseVersionHeader(headerValue);
  if (expectedVersion === null) throw outfitErrors.versionMalformed();
  return expectedVersion;
};

const toWriteCall = (req: Request, res: Response, outfitId: string): OutfitWriteCall => ({
  actorId: requireAuthPrincipal(res).userId,
  outfitId,
  expectedVersion: readExpectedVersion(req),
  idempotencyKey: readRequiredIdempotencyKey(req),
});

const sendWriteResult = (res: Response, result: OutfitWriteResult, message: string): void => {
  res.setHeader(ETAG_HEADER, toETag(result.version));
  sendSuccess(res, result, message);
};

export const outfitController = {
  async create(req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<CreateOutfitBody>(res);
    const board = await outfitService.create(userId, body, readRequiredIdempotencyKey(req));
    res.setHeader(ETAG_HEADER, toETag(board.version));
    sendSuccess(res, board, "Build started.", CREATED_STATUS);
  },

  async get(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    const outfit = await outfitService.get(userId, id);
    if (outfit.kind === "board") res.setHeader(ETAG_HEADER, toETag(outfit.version));
    sendSuccess(res, outfit, "Build.");
  },

  async listEvents(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    const { sinceVersion } = validated.query<OutfitEventsQuery>(res);
    sendSuccess(res, await outfitService.listEvents(userId, id, sinceVersion), "Build history.");
  },

  async publishLook(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<PublishLookBody>(res);
    const { look, isNew } = await outfitPublishService.publishAsLook(userId, id, body);
    sendSuccess(
      res,
      look,
      isNew ? "Look posted." : "Look already posted.",
      isNew ? CREATED_STATUS : OK_STATUS,
    );
  },

  async getMyLook(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id } = validated.params<OutfitIdParam>(res);
    sendSuccess(res, await outfitPublishService.findMyPublishedLook(userId, id), "Your look.");
  },

  async listReplacements(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { id, slotKey, position } = validated.params<OutfitSlotPositionParam>(res);
    sendSuccess(
      res,
      await outfitReplacementService.listReplacements(userId, { outfitId: id, slotKey, position }),
      "Replacements.",
    );
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListOutfitsQuery>(res);
    sendSuccess(res, await outfitService.listMine(userId, query), "Your builds.");
  },

  async listSharedWithMe(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListOutfitsQuery>(res);
    sendSuccess(
      res,
      await outfitService.listSharedWithMe(userId, query),
      "Builds shared with you.",
    );
  },

  async placeItem(req: Request, res: Response) {
    const { id, slotKey, position } = validated.params<OutfitSlotPositionParam>(res);
    const body = validated.body<PlaceItemBody>(res);
    const result = await outfitService.placeItem(
      toWriteCall(req, res, id),
      { slotKey, position },
      body,
    );
    sendWriteResult(res, result, "Item placed.");
  },

  async removeItem(req: Request, res: Response) {
    const { id, slotKey, position } = validated.params<OutfitSlotPositionParam>(res);
    const result = await outfitService.removeItem(toWriteCall(req, res, id), { slotKey, position });
    sendWriteResult(res, result, "Item removed.");
  },

  async reorderSlot(req: Request, res: Response) {
    const { id, slotKey } = validated.params<OutfitSlotParam>(res);
    const body = validated.body<ReorderSlotBody>(res);
    const result = await outfitService.reorderSlot(toWriteCall(req, res, id), { slotKey }, body);
    sendWriteResult(res, result, "Items reordered.");
  },

  async updateSettings(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<UpdateOutfitSettingsBody>(res);
    const result = await outfitService.updateSettings(toWriteCall(req, res, id), body);
    sendWriteResult(res, result, "Build settings saved.");
  },

  async setHappy(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<SetHappyBody>(res);
    const result = await outfitService.setHappy(toWriteCall(req, res, id), body);
    sendWriteResult(res, result, "Saved.");
  },

  async lock(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    sendWriteResult(res, await outfitService.lock(toWriteCall(req, res, id)), "Build locked.");
  },

  async unlock(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    sendWriteResult(res, await outfitService.unlock(toWriteCall(req, res, id)), "Build unlocked.");
  },

  async archive(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    sendWriteResult(res, await outfitService.archive(toWriteCall(req, res, id)), "Build archived.");
  },

  async addEditors(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<AddEditorsBody>(res);
    const result = await outfitMemberService.addEditors(toWriteCall(req, res, id), body);
    sendWriteResult(res, result, "People added.");
  },

  async removeEditor(req: Request, res: Response) {
    const { id, userId } = validated.params<OutfitMemberParam>(res);
    const result = await outfitMemberService.removeEditor(toWriteCall(req, res, id), userId);
    sendWriteResult(res, result, "Person removed.");
  },

  async leave(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    const result = await outfitMemberService.leave(toWriteCall(req, res, id));
    sendWriteResult(res, result, "You left the build.");
  },

  async transferOwnership(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<TransferOwnershipBody>(res);
    const result = await outfitMemberService.transferOwnership(toWriteCall(req, res, id), body);
    sendWriteResult(res, result, "Build handed over.");
  },

  async setVisibility(req: Request, res: Response) {
    const { id } = validated.params<OutfitIdParam>(res);
    const body = validated.body<SetVisibilityBody>(res);
    const result = await outfitVisibilityService.setVisibility(toWriteCall(req, res, id), body);
    sendWriteResult(res, result, "Who can see this build was updated.");
  },

  async removeShare(req: Request, res: Response) {
    const { id, userId } = validated.params<OutfitMemberParam>(res);
    const result = await outfitVisibilityService.removeShare(toWriteCall(req, res, id), userId);
    sendWriteResult(res, result, "Stopped sharing with that person.");
  },
};
