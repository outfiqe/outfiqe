import { Button, FormBanner, Input, Label, Modal } from "@outfiqe/design-system";
import { useId, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import type { RiderPayRates } from "../api/riderPaySchemas";
import { useCreateRiderPayRate } from "../hooks/useCreateRiderPayRate";

const MIN_PAY_AMOUNT = 0;

type RiderPayRateModalProps = {
  payRates: RiderPayRates;
  onClose: () => void;
};

type PayAmountField = "visitAmount" | "extraStopAmount" | "wastedVisitAmount";

const PAY_AMOUNT_FIELDS: { field: PayAmountField; label: string; hint: string }[] = [
  { field: "visitAmount", label: "Per visit (Rs.)", hint: "Covers the first bag at a location." },
  {
    field: "extraStopAmount",
    label: "Per extra bag (Rs.)",
    hint: "Each further bag collected or returned on the same visit.",
  },
  {
    field: "wastedVisitAmount",
    label: "Wasted visit (Rs.)",
    hint: "When the brand wasn't ready and nothing was collected.",
  },
];

export const RiderPayRateModal = ({ payRates, onClose }: RiderPayRateModalProps) => {
  const createRate = useCreateRiderPayRate();
  const { rateInEffect } = payRates;
  const [amounts, setAmounts] = useState<Record<PayAmountField, number>>({
    visitAmount: rateInEffect.visitAmount,
    extraStopAmount: rateInEffect.extraStopAmount,
    wastedVisitAmount: rateInEffect.wastedVisitAmount,
  });
  const [startsOn, setStartsOn] = useState("");
  const fieldIdPrefix = useId();

  const saveRate = () => {
    createRate.mutate(
      {
        countryCode: payRates.countryCode,
        ...amounts,
        ...(startsOn ? { effectiveFrom: new Date(startsOn).toISOString() } : {}),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Change contractor rider pay"
      description="Visits finished before the new rate starts keep the pay they earned."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button onClick={saveRate} isLoading={createRate.isPending}>
            Save rate
          </Button>
        </div>
      }
    >
      {createRate.isError && <FormBanner>{getErrorMessage(createRate.error)}</FormBanner>}
      <div className="space-y-3">
        {PAY_AMOUNT_FIELDS.map(({ field, label, hint }) => (
          <div key={field}>
            <Label htmlFor={`${fieldIdPrefix}-${field}`}>{label}</Label>
            <Input
              id={`${fieldIdPrefix}-${field}`}
              type="number"
              inputMode="numeric"
              min={MIN_PAY_AMOUNT}
              value={amounts[field]}
              onChange={(event) =>
                setAmounts((currentAmounts) => ({
                  ...currentAmounts,
                  [field]: Number(event.target.value),
                }))
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
        <div>
          <Label htmlFor={`${fieldIdPrefix}-starts`}>Starts (optional)</Label>
          <Input
            id={`${fieldIdPrefix}-starts`}
            type="datetime-local"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Leave empty to start now.</p>
        </div>
      </div>
    </Modal>
  );
};
