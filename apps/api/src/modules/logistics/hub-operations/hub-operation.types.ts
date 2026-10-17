import type {
  PartnerBookingStatus,
  PickupStatus,
  ShipmentStatus,
} from "#generated/prisma/enums.js";

export type PickupCheckInView = {
  fulfilmentGroupId: string;
  orderId: string;
  brandName: string;
  pickupStatus: PickupStatus | null;
  expectedUnits: number;
  countedUnits: number;
  hasCountMismatch: boolean;
};

export type PickupInspectionView = {
  fulfilmentGroupId: string;
  orderId: string;
  failedUnits: number;
  refundId: string | null;
  pickupStatus: PickupStatus | null;
};

export type ParcelBookingSummary = {
  bookingId: string;
  partnerId: string;
  partnerName: string;
  status: PartnerBookingStatus;
  merchantReference: string;
  partnerReference: string | null;
};

export type PackedParcelView = {
  shipmentId: string;
  trackingCode: string;
  status: ShipmentStatus;
  codAmountToCollect: number;
  fulfilmentGroupIds: string[];
  booking: ParcelBookingSummary | null;
};

export type ParcelHandoverView = {
  shipmentId: string;
  trackingCode: string;
  status: ShipmentStatus;
};

export type ParcelLabelView = {
  shipmentId: string;
  trackingCode: string;
  displayTrackingCode: string;
  orderId: string;
  status: ShipmentStatus;
  currency: string;
  codAmountToCollect: number;
  isLabelUpToDate: boolean;
  labelPrintedAt: string | null;
  weightGrams: number;
  parcelCount: number;
  packedAt: string;
  recipient: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    landmark: string | null;
  };
  sender: { name: string; address: string; city: string; phone: string };
  partner: {
    name: string;
    partnerReference: string | null;
    partnerLabelUrl: string | null;
    status: PartnerBookingStatus;
  } | null;
};
