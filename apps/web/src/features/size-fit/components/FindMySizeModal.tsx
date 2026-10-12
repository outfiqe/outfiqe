"use client";

import { Button, Input, Modal, toast } from "@outfiqe/design-system";
import {
  FIT_HEIGHT_CM_MAX,
  FIT_HEIGHT_CM_MIN,
  FIT_WEIGHT_KG_MAX,
  FIT_WEIGHT_KG_MIN,
  type FitRange,
  type FitSizeMatch,
  recommendFitSize,
} from "@outfiqe/utils";
import Link from "next/link";
import { useId, useState } from "react";

import { useAuth } from "@/features/auth";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import { useFitProfile, useSaveFitProfile } from "../hooks/useFitProfile";
import { describeFitRecommendation } from "../utils/describeFitRecommendation";
import { readDeviceMeasurements, rememberDeviceMeasurements } from "../utils/deviceMeasurements";
import { buildFitPagePath } from "../utils/fitPagePath";
import {
  type MeasurementDraft,
  toFitMeasurements,
  toMeasurementDraft,
} from "../utils/measurementDraft";

export type FitSize = {
  id: string;
  label: string;
  inStock: boolean;
  fitRange: FitRange | null;
};

type FindMySizeModalProps = {
  open: boolean;
  onClose: () => void;
  productName: string;
  sizes: FitSize[];
  isStretchable: boolean | null;
  onSelectSize: (sizeId: string) => void;
};

const PRIMARY_SUGGESTION_INDEX = 0;

const OUT_OF_BOUNDS_MESSAGE = `Enter a height from ${FIT_HEIGHT_CM_MIN} to ${FIT_HEIGHT_CM_MAX} cm and a weight from ${FIT_WEIGHT_KG_MIN} to ${FIT_WEIGHT_KG_MAX} kg, in whole numbers.`;

type FindMySizeContentProps = Omit<FindMySizeModalProps, "open" | "productName">;

const FindMySizeContent = ({
  onClose,
  sizes,
  isStretchable,
  onSelectSize,
}: FindMySizeContentProps) => {
  const heightInputId = useId();
  const weightInputId = useId();
  const { isAuthenticated } = useAuth();
  const fitProfile = useFitProfile();
  const saveFitProfile = useSaveFitProfile();
  const [draft, setDraft] = useState<MeasurementDraft>(() =>
    toMeasurementDraft(fitProfile.data ?? readDeviceMeasurements()),
  );

  const measurements = toFitMeasurements(draft);
  const isDraftComplete = draft.heightCm.trim() !== "" && draft.weightKg.trim() !== "";
  const recommendationCopy = measurements
    ? describeFitRecommendation(
        recommendFitSize(
          sizes.map(({ id, label, fitRange }) => ({ sizeId: id, label, fitRange })),
          measurements,
          isStretchable,
        ),
        isStretchable,
      )
    : null;
  const isInStock = (sizeMatch: FitSizeMatch): boolean =>
    sizes.some(({ id, inStock }) => id === sizeMatch.sizeId && inStock);

  const selectSize = (sizeMatch: FitSizeMatch) => {
    if (measurements) rememberDeviceMeasurements(measurements);
    onSelectSize(sizeMatch.sizeId);
    onClose();
  };

  const saveToAccount = () => {
    if (!measurements) return;
    saveFitProfile.mutate(measurements, {
      onSuccess: () => toast.success("Measurements saved to your account"),
      onError: (saveError) => toast.error(getErrorMessage(saveError)),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={heightInputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Height (cm)
          </label>
          <Input
            id={heightInputId}
            inputMode="numeric"
            placeholder="165"
            value={draft.heightCm}
            onChange={(event) => setDraft({ ...draft, heightCm: event.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor={weightInputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Weight (kg)
          </label>
          <Input
            id={weightInputId}
            inputMode="numeric"
            placeholder="60"
            value={draft.weightKg}
            onChange={(event) => setDraft({ ...draft, weightKg: event.target.value })}
          />
        </div>
      </div>

      <div aria-live="polite" className="min-h-16">
        {isDraftComplete && !measurements && (
          <p className="text-sm text-destructive">{OUT_OF_BOUNDS_MESSAGE}</p>
        )}
        {recommendationCopy && (
          <div className="rounded-xl border border-border p-4">
            <p className="font-display text-lg font-bold text-foreground">
              {recommendationCopy.headline}
            </p>
            {recommendationCopy.detail && (
              <p className="mt-1 text-sm text-muted-foreground">{recommendationCopy.detail}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {[recommendationCopy.primarySize, recommendationCopy.alternativeSize]
                .filter((sizeMatch): sizeMatch is FitSizeMatch => sizeMatch !== null)
                .map((sizeMatch, index) => {
                  const isAvailable = isInStock(sizeMatch);
                  return (
                    <Button
                      key={sizeMatch.sizeId}
                      variant={index === PRIMARY_SUGGESTION_INDEX ? "default" : "outline"}
                      disabled={!isAvailable}
                      onClick={() => selectSize(sizeMatch)}
                    >
                      {isAvailable ? `Select ${sizeMatch.label}` : `${sizeMatch.label} is sold out`}
                    </Button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {measurements && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <Link
            href={buildFitPagePath(measurements)}
            onClick={() => rememberDeviceMeasurements(measurements)}
            className="text-sm font-medium text-foreground underline underline-offset-2"
          >
            See everything that fits you
          </Link>
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={saveToAccount}
              isLoading={saveFitProfile.isPending}
            >
              Save to my account
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export const FindMySizeModal = ({ open, productName, ...contentProps }: FindMySizeModalProps) => (
  <Modal
    open={open}
    onClose={contentProps.onClose}
    title="Find my size"
    description={`Enter your height and weight. We compare them with the ranges the brand set for each size of ${productName}.`}
    className="sm:max-w-md"
  >
    {open && <FindMySizeContent {...contentProps} />}
  </Modal>
);
