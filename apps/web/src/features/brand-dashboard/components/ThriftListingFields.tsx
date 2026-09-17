"use client";

import { Checkbox, Select, Textarea } from "@outfiqe/design-system";
import type { ThriftCondition } from "@outfiqe/utils";

import { THRIFT_CONDITION_OPTIONS } from "./ProductModal.constants";

type ThriftListingFieldsProps = {
  isThrift: boolean;
  onIsThriftChange: (isThrift: boolean) => void;
  conditionRating: ThriftCondition | undefined;
  onConditionRatingChange: (rating: ThriftCondition) => void;
  conditionNotes: string;
  onConditionNotesChange: (notes: string) => void;
  conditionError?: string;
};

export const ThriftListingFields = ({
  isThrift,
  onIsThriftChange,
  conditionRating,
  onConditionRatingChange,
  conditionNotes,
  onConditionNotesChange,
  conditionError,
}: ThriftListingFieldsProps) => (
  <div>
    <label className="flex items-center gap-2 text-sm text-foreground">
      <Checkbox checked={isThrift} onChange={(event) => onIsThriftChange(event.target.checked)} />
      This is a secondhand / thrifted piece
    </label>

    {isThrift && (
      <div className="mt-3 space-y-3 rounded-lg border border-border p-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Condition</label>
          <Select
            value={conditionRating ?? ""}
            onChange={(event) => onConditionRatingChange(event.target.value as ThriftCondition)}
          >
            <option value="" disabled>
              Select a condition
            </option>
            {THRIFT_CONDITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Condition notes
          </label>
          <Textarea
            placeholder="Small mark on the left cuff, otherwise excellent."
            value={conditionNotes}
            onChange={(event) => onConditionNotesChange(event.target.value)}
          />
        </div>

        {conditionError && <p className="text-xs text-destructive">{conditionError}</p>}
      </div>
    )}
  </div>
);
