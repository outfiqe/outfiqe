import type {
  ParcelBooking,
  ShipmentStatusValue,
} from "../../hub-operations/api/hubOperationsSchemas";
import type { ParcelSummary } from "../api/parcelsSchemas";

const AT_HUB_STATUS: ShipmentStatusValue = "PACKED";
const BOOKED_STATUS: ParcelBooking["status"] = "BOOKED";
const MANUAL_CONNECTION: ParcelBooking["connection"] = "MANUAL";
const STATUSES_WITH_PARTNER: ReadonlySet<ShipmentStatusValue> = new Set([
  "HANDED_TO_PARTNER",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
]);

type ParcelForNextStep = Pick<ParcelSummary, "status" | "booking" | "isLabelUpToDate">;

export const isParcelWaitingForBooking = ({ status, booking }: ParcelForNextStep): boolean =>
  status === AT_HUB_STATUS && booking !== null && booking.status !== BOOKED_STATUS;

const describeNextStepAtHub = (parcel: ParcelForNextStep): string | null => {
  const { booking, isLabelUpToDate } = parcel;
  if (booking === null) return "Choose a delivery partner.";
  if (isParcelWaitingForBooking(parcel)) {
    return booking.connection === MANUAL_CONNECTION
      ? `Book it in ${booking.partnerName}'s portal, then type their parcel number here.`
      : null;
  }
  if (!isLabelUpToDate) return "Print the label and stick it on the parcel.";
  return `Hand it over: scan the label on Hand over when ${booking.partnerName}'s rider collects it.`;
};

const describeNextStepWithPartner = ({ booking }: ParcelForNextStep): string | null => {
  if (booking === null || booking.connection !== MANUAL_CONNECTION) return null;
  return `Upload ${booking.partnerName}'s status sheet on their partner page, or record an update here.`;
};

export const describeParcelNextStep = (parcel: ParcelForNextStep): string | null => {
  if (parcel.status === AT_HUB_STATUS) return describeNextStepAtHub(parcel);
  if (STATUSES_WITH_PARTNER.has(parcel.status)) return describeNextStepWithPartner(parcel);
  return null;
};
