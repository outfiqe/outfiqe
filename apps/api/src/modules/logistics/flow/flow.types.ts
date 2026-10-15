import type { FulfilmentMode } from "#generated/prisma/enums.js";

export type FulfilmentAssignment = {
  brandId: string;
  fulfilmentMode: FulfilmentMode;
  hubId: string | null;
  pickupLocationId: string | null;
};

export type ResolveFulfilmentAssignmentsInput = {
  brandIds: readonly string[];
};
