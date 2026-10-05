import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getPlatformPrincipal } from "#modules/platform-access/platform-access.middleware.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { OUTFIT_SLOT_TYPE_AUDIT_TARGET_TYPE } from "./outfit-slot-type.constants.js";
import type {
  CreateOutfitSlotTypeBody,
  OutfitSlotTypeIdParam,
  ReorderOutfitSlotTypesBody,
  UpdateOutfitSlotTypeBody,
} from "./outfit-slot-type.schemas.js";
import { outfitSlotTypeService } from "./outfit-slot-type.service.js";
import { describeOutfitSlotTypeForAudit } from "./outfit-slot-type.utils.js";

const CREATED_STATUS = 201;

export const outfitSlotTypeController = {
  async listAll(_req: Request, res: Response) {
    sendSuccess(res, await outfitSlotTypeService.listForAdmin(), "Slot types.");
  },

  async create(_req: Request, res: Response) {
    const body = validated.body<CreateOutfitSlotTypeBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    const slotType = await outfitSlotTypeService.create(body);
    await platformAudit.record({
      actorUserId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_SLOT_TYPE_CREATED,
      summary: `Created slot type ${slotType.label}`,
      targetType: OUTFIT_SLOT_TYPE_AUDIT_TARGET_TYPE,
      targetId: slotType.id,
      metadata: { before: null, after: describeOutfitSlotTypeForAudit(slotType) },
    });

    sendSuccess(res, slotType, "Slot type created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { id } = validated.params<OutfitSlotTypeIdParam>(res);
    const body = validated.body<UpdateOutfitSlotTypeBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    const { before, after } = await outfitSlotTypeService.update(id, body);
    await platformAudit.record({
      actorUserId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_SLOT_TYPE_UPDATED,
      summary: `Updated slot type ${after.label}`,
      targetType: OUTFIT_SLOT_TYPE_AUDIT_TARGET_TYPE,
      targetId: id,
      metadata: {
        before: describeOutfitSlotTypeForAudit(before),
        after: describeOutfitSlotTypeForAudit(after),
      },
    });

    sendSuccess(res, after, "Slot type updated.");
  },

  async reorder(_req: Request, res: Response) {
    const { orderedIds } = validated.body<ReorderOutfitSlotTypesBody>(res);
    const { actorUserId } = getPlatformPrincipal(res);

    await outfitSlotTypeService.reorder(orderedIds);
    await platformAudit.record({
      actorUserId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_SLOT_TYPES_REORDERED,
      summary: "Reordered slot types",
      targetType: OUTFIT_SLOT_TYPE_AUDIT_TARGET_TYPE,
      targetId: null,
      metadata: { orderedIds },
    });

    sendSuccess(res, null, "Slot types reordered.");
  },
};
