import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { outfitSlotTypeController } from "./outfit-slot-type.controller.js";
import {
  createOutfitSlotTypeSchema,
  outfitSlotTypeIdParamSchema,
  reorderOutfitSlotTypesSchema,
  updateOutfitSlotTypeSchema,
} from "./outfit-slot-type.schemas.js";

export const outfitSlotTypeRoutes = Router();

outfitSlotTypeRoutes.get("/admin", ...platformGuards.catalogRead, outfitSlotTypeController.listAll);

outfitSlotTypeRoutes.post(
  "/",
  ...platformGuards.catalogManage,
  validate({ body: createOutfitSlotTypeSchema }),
  outfitSlotTypeController.create,
);

outfitSlotTypeRoutes.post(
  "/reorder",
  ...platformGuards.catalogManage,
  validate({ body: reorderOutfitSlotTypesSchema }),
  outfitSlotTypeController.reorder,
);

outfitSlotTypeRoutes.patch(
  "/:id",
  ...platformGuards.catalogManage,
  validate({ params: outfitSlotTypeIdParamSchema, body: updateOutfitSlotTypeSchema }),
  outfitSlotTypeController.update,
);
