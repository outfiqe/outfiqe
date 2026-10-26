import type { ParcelSummary } from "../api/parcelsSchemas";
import { describeParcelNextStep } from "../utils/parcelNextStep.utils";

type ParcelNextStepProps = {
  parcel: Pick<ParcelSummary, "status" | "booking" | "isLabelUpToDate">;
};

export const ParcelNextStep = ({ parcel }: ParcelNextStepProps) => {
  const nextStep = describeParcelNextStep(parcel);
  if (nextStep === null) return null;
  return (
    <p className="text-sm text-foreground">
      <span className="font-semibold">Next:</span> {nextStep}
    </p>
  );
};
