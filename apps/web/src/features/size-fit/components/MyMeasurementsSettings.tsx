"use client";

import { Button, Input, Skeleton, toast } from "@outfiqe/design-system";
import type { FitMeasurements } from "@outfiqe/utils";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { useFitProfile, useRemoveFitProfile, useSaveFitProfile } from "../hooks/useFitProfile";
import { forgetDeviceMeasurements, rememberDeviceMeasurements } from "../utils/deviceMeasurements";
import { toFitMeasurements, toMeasurementDraft } from "../utils/measurementDraft";

type MeasurementsFormProps = {
  savedMeasurements: FitMeasurements | null;
};

const MeasurementsForm = ({ savedMeasurements }: MeasurementsFormProps) => {
  const t = useTranslations("fitProfile");
  const heightInputId = useId();
  const weightInputId = useId();
  const [draft, setDraft] = useState(() => toMeasurementDraft(savedMeasurements));
  const [isInvalid, setIsInvalid] = useState(false);
  const saveFitProfile = useSaveFitProfile();
  const removeFitProfile = useRemoveFitProfile();
  const isBusy = saveFitProfile.isPending || removeFitProfile.isPending;

  const saveMeasurements = () => {
    const measurements = toFitMeasurements(draft);
    setIsInvalid(measurements === null);
    if (!measurements) return;
    saveFitProfile.mutate(measurements, {
      onSuccess: () => {
        rememberDeviceMeasurements(measurements);
        toast.success(t("saved"));
      },
      onError: () => toast.error(t("saveFailed")),
    });
  };

  const removeMeasurements = () =>
    removeFitProfile.mutate(undefined, {
      onSuccess: () => {
        forgetDeviceMeasurements();
        toast.success(t("removed"));
      },
      onError: () => toast.error(t("saveFailed")),
    });

  return (
    <form
      className="space-y-4 rounded-xl border border-border bg-card p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        saveMeasurements();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={heightInputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t("heightLabel")}
          </label>
          <Input
            id={heightInputId}
            inputMode="numeric"
            value={draft.heightCm}
            aria-invalid={isInvalid}
            onChange={(event) => setDraft({ ...draft, heightCm: event.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor={weightInputId}
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t("weightLabel")}
          </label>
          <Input
            id={weightInputId}
            inputMode="numeric"
            value={draft.weightKg}
            aria-invalid={isInvalid}
            onChange={(event) => setDraft({ ...draft, weightKg: event.target.value })}
          />
        </div>
      </div>
      {isInvalid && (
        <p role="alert" className="text-sm text-destructive">
          {t("invalid")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={saveFitProfile.isPending} disabled={isBusy}>
          {t("save")}
        </Button>
        {savedMeasurements && (
          <Button type="button" variant="outline" disabled={isBusy} onClick={removeMeasurements}>
            {t("remove")}
          </Button>
        )}
      </div>
    </form>
  );
};

export const MyMeasurementsSettings = () => {
  const t = useTranslations("fitProfile");
  const { data: savedMeasurements, isPending, isError, refetch } = useFitProfile();

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-muted p-3 text-sm text-foreground">{t("sizesMoved")}</p>
      {isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : isError ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : (
        <MeasurementsForm
          key={
            savedMeasurements
              ? `${savedMeasurements.heightCm}-${savedMeasurements.weightKg}`
              : "no-measurements"
          }
          savedMeasurements={savedMeasurements}
        />
      )}
    </div>
  );
};
