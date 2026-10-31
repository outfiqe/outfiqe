import { formatDate } from "@outfiqe/utils";

import type { UnremittedParcel } from "../api/codSchemas";

const NO_AMOUNT = 0;

export type PartnerFeeByShipmentId = Readonly<Record<string, number>>;

export type RemittanceTotals = {
  parcelCount: number;
  collectedAmount: number;
  partnerFeeAmount: number;
  receivedAmount: number;
};

export const defaultPartnerFee = ({ quotedPartnerFee, collectedAmount }: UnremittedParcel) =>
  Math.min(quotedPartnerFee ?? NO_AMOUNT, collectedAmount);

export const sumRemittanceTotals = (
  parcels: readonly UnremittedParcel[],
  feeByShipmentId: PartnerFeeByShipmentId,
): RemittanceTotals => {
  const tickedParcels = parcels.filter(({ shipmentId }) => shipmentId in feeByShipmentId);
  const collectedAmount = tickedParcels.reduce(
    (total, parcel) => total + parcel.collectedAmount,
    NO_AMOUNT,
  );
  const partnerFeeAmount = tickedParcels.reduce(
    (total, { shipmentId }) => total + (feeByShipmentId[shipmentId] ?? NO_AMOUNT),
    NO_AMOUNT,
  );
  return {
    parcelCount: tickedParcels.length,
    collectedAmount,
    partnerFeeAmount,
    receivedAmount: collectedAmount - partnerFeeAmount,
  };
};

export const formatCashAmount = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const DATE_INPUT_LOCALE = "en-CA";

export const toDateInputValue = (date: Date) => date.toLocaleDateString(DATE_INPUT_LOCALE);

export const dateInputValueToIso = (dateInputValue: string) =>
  new Date(`${dateInputValue}T00:00:00`).toISOString();

export const formatCashDate = (isoDate: string) => formatDate(isoDate);
