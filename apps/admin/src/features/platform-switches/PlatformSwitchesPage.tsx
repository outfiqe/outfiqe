import { Button, FormBanner, Select, Textarea } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { FEATURE_SWITCHES_QUERY_KEY, featureSwitchesApi } from "./api";
import { FEATURE_ROLLOUTS, type FeatureRollout, type FeatureSwitch } from "./schemas";

const SKELETON_ROW_COUNT = 4;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_SEPARATOR = /[\s,]+/;

const ROLLOUT_LABEL: Record<FeatureRollout, string> = {
  OFF: "Off for everyone",
  ALLOW_LIST: "On for the people and brands listed",
  EVERYONE: "On for everyone",
};

const parseIds = (text: string): string[] =>
  text
    .split(ID_SEPARATOR)
    .map((id) => id.trim())
    .filter((id) => id !== "");

const isFeatureRollout = (value: string): value is FeatureRollout =>
  FEATURE_ROLLOUTS.some((rollout) => rollout === value);

const FeatureSwitchCard = ({ featureSwitch }: { featureSwitch: FeatureSwitch }) => {
  const fieldId = useId();
  const [rollout, setRollout] = useState<FeatureRollout>(featureSwitch.rollout);
  const [userIdsText, setUserIdsText] = useState(featureSwitch.allowedUserIds.join("\n"));
  const [brandIdsText, setBrandIdsText] = useState(featureSwitch.allowedBrandIds.join("\n"));
  const [formProblem, setFormProblem] = useState<string | null>(null);

  const save = useApiMutation({
    successMessage: `${featureSwitch.label} saved.`,
    mutationFn: () =>
      featureSwitchesApi.update(featureSwitch.key, {
        rollout,
        allowedUserIds: parseIds(userIdsText),
        allowedBrandIds: parseIds(brandIdsText),
      }),
    invalidateKeys: [FEATURE_SWITCHES_QUERY_KEY],
  });

  const saveIfValid = () => {
    const invalidId = [...parseIds(userIdsText), ...parseIds(brandIdsText)].find(
      (id) => !UUID_PATTERN.test(id),
    );
    if (invalidId) {
      setFormProblem(`"${invalidId}" isn't a valid ID.`);
      return;
    }
    setFormProblem(null);
    save.mutate();
  };

  return (
    <section
      aria-labelledby={`${fieldId}-title`}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <div>
        <h2 id={`${fieldId}-title`} className="font-display text-base font-bold text-foreground">
          {featureSwitch.label}
        </h2>
        <p className="text-sm text-muted-foreground">{featureSwitch.description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{featureSwitch.key}</p>
      </div>

      <div className="max-w-sm space-y-1.5">
        <label htmlFor={`${fieldId}-rollout`} className="text-xs text-muted-foreground">
          Who has it
        </label>
        <Select
          id={`${fieldId}-rollout`}
          value={rollout}
          onChange={(event) => {
            const { value } = event.target;
            if (isFeatureRollout(value)) setRollout(value);
          }}
        >
          {FEATURE_ROLLOUTS.map((option) => (
            <option key={option} value={option}>
              {ROLLOUT_LABEL[option]}
            </option>
          ))}
        </Select>
      </div>

      {rollout === "ALLOW_LIST" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-users`} className="text-xs text-muted-foreground">
              Person IDs (one per line)
            </label>
            <Textarea
              id={`${fieldId}-users`}
              rows={4}
              value={userIdsText}
              onChange={(event) => setUserIdsText(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-brands`} className="text-xs text-muted-foreground">
              Brand IDs (one per line)
            </label>
            <Textarea
              id={`${fieldId}-brands`}
              rows={4}
              value={brandIdsText}
              onChange={(event) => setBrandIdsText(event.target.value)}
            />
          </div>
        </div>
      )}

      {formProblem && <FormBanner>{formProblem}</FormBanner>}
      {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}
      <Button size="sm" onClick={saveIfValid} isLoading={save.isPending}>
        Save
      </Button>
    </section>
  );
};

export const PlatformSwitchesPage = () => {
  const switches = useQuery({
    queryKey: FEATURE_SWITCHES_QUERY_KEY,
    queryFn: featureSwitchesApi.list,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Feature switches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn platform features on for nobody, for a list of people and brands, or for everyone.
          Every change is recorded in the audit log.
        </p>
      </div>

      {switches.isLoading &&
        Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <CardRowSkeleton key={index} textLineCount={3} />
        ))}
      {switches.error && <FormBanner>{getErrorMessage(switches.error)}</FormBanner>}
      {switches.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">There are no feature switches yet.</p>
      )}
      {switches.data?.map((featureSwitch) => (
        <FeatureSwitchCard key={featureSwitch.key} featureSwitch={featureSwitch} />
      ))}
    </div>
  );
};
