"use client";

import { Button, Select, Switch, toast } from "@outfiqe/design-system";
import { useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BrandProfile, BrandTagReviewPolicyValue } from "../api/brandDashboardSchemas";
import { useUpdateBrandProfile } from "../hooks/useUpdateBrandProfile";
import { BRAND_TAG_POLICY_OPTIONS } from "../tagReview.constants";

export const BrandTagPolicyCard = ({ profile }: { profile: BrandProfile }) => {
  const updateProfile = useUpdateBrandProfile();
  const { brand } = profile;

  const [saved, setSaved] = useState({
    policy: brand.tagReviewPolicy,
    autoApproveVerifiedBuyers: brand.autoApproveVerifiedBuyers,
  });
  const [policy, setPolicy] = useState<BrandTagReviewPolicyValue>(brand.tagReviewPolicy);
  const [autoApproveVerifiedBuyers, setAutoApproveVerifiedBuyers] = useState(
    brand.autoApproveVerifiedBuyers,
  );

  const isDirty =
    policy !== saved.policy || autoApproveVerifiedBuyers !== saved.autoApproveVerifiedBuyers;

  const activeOption = BRAND_TAG_POLICY_OPTIONS.find((option) => option.value === policy);

  const save = () => {
    updateProfile.mutate(
      { tagReviewPolicy: policy, autoApproveVerifiedBuyers },
      {
        onSuccess: (updated) => {
          setSaved({
            policy: updated.brand.tagReviewPolicy,
            autoApproveVerifiedBuyers: updated.brand.autoApproveVerifiedBuyers,
          });
          toast.success("Tagging rules updated");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-bold text-foreground">Creator tagging</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Decide whose product tags go live on their looks straight away, and whose wait for your
        review.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label
            htmlFor="brand-tag-policy"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            When a creator tags one of your products
          </label>
          <Select
            id="brand-tag-policy"
            value={policy}
            onChange={(event) => setPolicy(event.target.value as BrandTagReviewPolicyValue)}
          >
            {BRAND_TAG_POLICY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {activeOption && (
            <p className="mt-1.5 text-xs text-muted-foreground">{activeOption.description}</p>
          )}
        </div>

        <label className="flex items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-foreground">
              Auto-approve verified buyers
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              A creator who bought the exact product on Outfiqe gets tagged automatically, even
              under &ldquo;Review every tag&rdquo;.
            </span>
          </span>
          <Switch
            checked={autoApproveVerifiedBuyers}
            onChange={(event) => setAutoApproveVerifiedBuyers(event.target.checked)}
            aria-label="Auto-approve verified buyers"
          />
        </label>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!isDirty || updateProfile.isPending}>
            {updateProfile.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
