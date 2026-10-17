import { Button } from "@outfiqe/design-system";

import type { ParcelBooking } from "../../hub-operations/api/hubOperationsSchemas";
import { useRetryParcelBooking } from "../hooks/useRetryParcelBooking";
import { ManualBookingForm } from "./ManualBookingForm";

const API_CONNECTION: ParcelBooking["connection"] = "API";
const REQUESTED_STATUS: ParcelBooking["status"] = "REQUESTED";
const FAILED_STATUS: ParcelBooking["status"] = "BOOKING_FAILED";

type ParcelBookingActionsProps = { shipmentId: string; booking: ParcelBooking };

export const ParcelBookingActions = ({ shipmentId, booking }: ParcelBookingActionsProps) => {
  const retryBooking = useRetryParcelBooking(shipmentId);
  const { connection, status, partnerName, failureReason } = booking;
  const isConnectedPartner = connection === API_CONNECTION;

  if (isConnectedPartner && status === REQUESTED_STATUS) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Booking with {partnerName}… this usually takes a few seconds.
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      {isConnectedPartner && status === FAILED_STATUS && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/10 p-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{partnerName} didn&apos;t book this parcel.</span>{" "}
            {failureReason ?? "No reason was given."} Try again, book it in their portal and type
            the number below, or change partner.
          </p>
          <Button
            size="sm"
            onClick={() => retryBooking.mutate()}
            isLoading={retryBooking.isPending}
          >
            Try again
          </Button>
        </div>
      )}
      <ManualBookingForm shipmentId={shipmentId} partnerName={partnerName} />
    </div>
  );
};
