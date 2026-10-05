import { Button, FormBanner, Select } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { BrandSearchField } from "@/components/BrandSearchField";
import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { UserSearchField } from "@/components/UserSearchField";
import { getErrorMessage } from "@/lib/errorMessages";

import { AllowListChips } from "./AllowListChips";
import { FEATURE_SWITCHES_QUERY_KEY, featureSwitchesApi } from "./api";
import {
  type AllowListedBrand,
  type AllowListedUser,
  FEATURE_ROLLOUTS,
  type FeatureRollout,
  type FeatureSwitch,
} from "./schemas";

const SKELETON_ROW_COUNT = 4;

const ROLLOUT_LABEL: Record<FeatureRollout, string> = {
  OFF: "Off for everyone",
  ALLOW_LIST: "On for the people and brands listed",
  EVERYONE: "On for everyone",
};

const isFeatureRollout = (value: string): value is FeatureRollout =>
  FEATURE_ROLLOUTS.some((rollout) => rollout === value);

const addIfMissing = <Entry extends { id: string }>(entries: Entry[], added: Entry): Entry[] =>
  entries.some(({ id }) => id === added.id) ? entries : [...entries, added];

const FeatureSwitchCard = ({ featureSwitch }: { featureSwitch: FeatureSwitch }) => {
  const fieldId = useId();
  const [rollout, setRollout] = useState<FeatureRollout>(featureSwitch.rollout);
  const [allowedUsers, setAllowedUsers] = useState<AllowListedUser[]>(featureSwitch.allowedUsers);
  const [allowedBrands, setAllowedBrands] = useState<AllowListedBrand[]>(
    featureSwitch.allowedBrands,
  );

  const save = useApiMutation({
    successMessage: `${featureSwitch.label} saved.`,
    mutationFn: () =>
      featureSwitchesApi.update(featureSwitch.key, {
        rollout,
        allowedUserIds: allowedUsers.map(({ id }) => id),
        allowedBrandIds: allowedBrands.map(({ id }) => id),
      }),
    invalidateKeys: [FEATURE_SWITCHES_QUERY_KEY],
  });

  const removeUser = (userId: string) =>
    setAllowedUsers((users) => users.filter(({ id }) => id !== userId));
  const removeBrand = (brandId: string) =>
    setAllowedBrands((brands) => brands.filter(({ id }) => id !== brandId));

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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <UserSearchField
              id={`${fieldId}-add-person`}
              label="Add a person"
              value={null}
              onChange={(user) => {
                if (user) setAllowedUsers((users) => addIfMissing(users, user));
              }}
            />
            <AllowListChips
              listLabel={`People who have ${featureSwitch.label}`}
              entries={allowedUsers.map(({ id, name, handle }) => ({
                id,
                name,
                detail: `@${handle}`,
              }))}
              emptyText="No people added yet."
              onRemove={removeUser}
            />
          </div>
          <div className="space-y-2">
            <BrandSearchField
              id={`${fieldId}-add-brand`}
              label="Add a brand (everyone on the brand's team gets it)"
              placeholder="Search brands…"
              value={null}
              onChange={(brand) => {
                if (brand) {
                  setAllowedBrands((brands) =>
                    addIfMissing(brands, { id: brand.id, name: brand.name }),
                  );
                }
              }}
            />
            <AllowListChips
              listLabel={`Brands that have ${featureSwitch.label}`}
              entries={allowedBrands}
              emptyText="No brands added yet."
              onRemove={removeBrand}
            />
          </div>
        </div>
      )}

      {save.isError && <FormBanner>{getErrorMessage(save.error)}</FormBanner>}
      <Button size="sm" onClick={() => save.mutate()} isLoading={save.isPending}>
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
