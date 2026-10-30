import { Input } from "@outfiqe/design-system";

import { FieldErrorMessage } from "@/components/FieldErrorMessage";
import { ImageUpload } from "@/components/ImageUpload";

import type { ChallengeFieldsProps } from "../types/challengeForm.types";

export const ChallengePageFields = ({ idPrefix, form, onChange, errors }: ChallengeFieldsProps) => (
  <div className="rounded-xl border border-border p-4">
    <p className="mb-3 text-sm font-medium text-foreground">Challenge page</p>
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-challenge-name`}
          className="block text-xs text-muted-foreground"
        >
          Challenge name
        </label>
        <Input
          id={`${idPrefix}-challenge-name`}
          aria-invalid={"challengeName" in errors}
          value={form.challengeName}
          onChange={(e) => onChange({ ...form, challengeName: e.target.value })}
        />
        <FieldErrorMessage message={errors.challengeName} />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-challenge-description`}
          className="block text-xs text-muted-foreground"
        >
          Challenge description
        </label>
        <Input
          id={`${idPrefix}-challenge-description`}
          aria-invalid={"challengeDescription" in errors}
          value={form.challengeDescription}
          onChange={(e) => onChange({ ...form, challengeDescription: e.target.value })}
        />
        <FieldErrorMessage message={errors.challengeDescription} />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Banner</p>
        <ImageUpload
          value={form.bannerImageUrl}
          onChange={(url) => onChange({ ...form, bannerImageUrl: url })}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor={`${idPrefix}-active-from`}
            className="block text-xs text-muted-foreground"
          >
            Starts
          </label>
          <Input
            id={`${idPrefix}-active-from`}
            type="datetime-local"
            aria-invalid={"activeFrom" in errors}
            value={form.activeFrom}
            onChange={(e) => onChange({ ...form, activeFrom: e.target.value })}
            className="w-full sm:w-56"
          />
          <FieldErrorMessage message={errors.activeFrom} />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`${idPrefix}-active-until`}
            className="block text-xs text-muted-foreground"
          >
            Ends
          </label>
          <Input
            id={`${idPrefix}-active-until`}
            type="datetime-local"
            aria-invalid={"activeUntil" in errors}
            value={form.activeUntil}
            onChange={(e) => onChange({ ...form, activeUntil: e.target.value })}
            className="w-full sm:w-56"
          />
          <FieldErrorMessage message={errors.activeUntil} />
        </div>
      </div>
    </div>
  </div>
);
