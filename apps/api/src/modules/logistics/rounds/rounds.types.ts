import type { RiderTaskStatus } from "#generated/prisma/enums.js";

export type PickupBoardLocation = {
  pickupLocationId: string;
  label: string;
  brandId: string;
  brandName: string;
  address: string;
  city: string;
  pickups: {
    fulfilmentGroupId: string;
    orderId: string;
    itemCount: number;
    readyForPickupAt: string | null;
  }[];
};

export type RiderTaskSummary = {
  id: string;
  status: RiderTaskStatus;
  roundStartsAt: string;
  riderId: string;
  riderName: string;
  brandName: string;
  pickupLocationLabel: string;
  stopCount: number;
  collectedCount: number;
  assignedAt: string;
  completedAt: string | null;
  wastedReason: string | null;
};

export type RiderTaskStopView = {
  id: string;
  fulfilmentGroupId: string;
  orderId: string;
  itemCount: number;
  isCollected: boolean;
  bagTagCode: string | null;
};

export type RiderTaskView = {
  id: string;
  status: RiderTaskStatus;
  roundStartsAt: string;
  brandName: string;
  pickupLocation: {
    label: string;
    contactName: string;
    contactPhoneE164: string;
    address: string;
    landmark: string | null;
    city: string;
    latitude: number | null;
    longitude: number | null;
    openingNote: string | null;
  };
  stops: RiderTaskStopView[];
};
