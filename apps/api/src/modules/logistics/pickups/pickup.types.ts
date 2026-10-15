import type { PickupStatus } from "#generated/prisma/enums.js";

export type BrandPickupView = {
  fulfilmentGroupId: string;
  pickupStatus: PickupStatus;
  pickupCode: string;
  readyForPickupAt: string | null;
};
