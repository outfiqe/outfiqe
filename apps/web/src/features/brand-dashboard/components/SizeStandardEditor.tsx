"use client";

import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { SizeStandard } from "../api/sizeStandardSchemas";
import { useCreateSizeStandard, useUpdateSizeStandard } from "../hooks/useSizeStandards";
import {
  isDuplicateLabel,
  MAX_LABELS_PER_STANDARD,
  sizeLabelSchema,
  sizeStandardFormSchema,
} from "../schemas/sizeStandardForm.schema";
import { SIZE_STANDARD_TEMPLATES } from "./SizeStandardEditor.constants";

const PREVIOUS_POSITION_STEP = -1;
const NEXT_POSITION_STEP = 1;
const FIRST_INDEX = 0;
const LAST_INDEX_OFFSET = 1;

type SizeStandardEditorProps = {
  standard?: SizeStandard;
  onSaved: (savedStandard: SizeStandard) => void;
  onCancel: () => void;
};

const moveLabel = (labels: string[], fromIndex: number, step: number): string[] => {
  const toIndex = fromIndex + step;
  const movingLabel = labels[fromIndex];
  if (movingLabel === undefined || toIndex < FIRST_INDEX || toIndex >= labels.length) return labels;
  const reorderedLabels = labels.filter((_label, index) => index !== fromIndex);
  reorderedLabels.splice(toIndex, 0, movingLabel);
  return reorderedLabels;
};

export const SizeStandardEditor = ({ standard, onSaved, onCancel }: SizeStandardEditorProps) => {
  const nameInputId = useId();
  const newLabelInputId = useId();
  const [name, setName] = useState(standard?.name ?? "");
  const [labels, setLabels] = useState<string[]>(standard?.labels.map(({ label }) => label) ?? []);
  const [newLabel, setNewLabel] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const createStandard = useCreateSizeStandard();
  const updateStandard = useUpdateSizeStandard();
  const isSaving = createStandard.isPending || updateStandard.isPending;
  const saveError = createStandard.error ?? updateStandard.error;
  const hasReachedLabelLimit = labels.length >= MAX_LABELS_PER_STANDARD;

  const addNewLabel = () => {
    const parsedLabel = sizeLabelSchema.safeParse(newLabel);
    if (!parsedLabel.success) {
      setValidationMessage(parsedLabel.error.issues[0]?.message ?? null);
      return;
    }
    if (isDuplicateLabel(labels, parsedLabel.data)) {
      setValidationMessage(`${parsedLabel.data} is already in this size standard`);
      return;
    }
    setLabels([...labels, parsedLabel.data]);
    setNewLabel("");
    setValidationMessage(null);
  };

  const addLabelOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addNewLabel();
  };

  const startFromTemplate = (templateLabels: readonly string[], templateName: string) => {
    setLabels([...templateLabels]);
    if (name.trim() === "") setName(templateName);
    setValidationMessage(null);
  };

  const saveStandard = async () => {
    const parsedStandard = sizeStandardFormSchema.safeParse({ name, labels });
    if (!parsedStandard.success) {
      setValidationMessage(parsedStandard.error.issues[0]?.message ?? null);
      return;
    }
    setValidationMessage(null);
    try {
      const savedStandard = standard
        ? await updateStandard.mutateAsync({ standardId: standard.id, input: parsedStandard.data })
        : await createStandard.mutateAsync(parsedStandard.data);
      onSaved(savedStandard);
    } catch {
      return;
    }
  };

  return (
    <div className="space-y-4">
      {saveError && <FormBanner>{getErrorMessage(saveError)}</FormBanner>}

      <div>
        <label htmlFor={nameInputId} className="mb-1.5 block text-sm font-medium text-foreground">
          Name
        </label>
        <Input
          id={nameInputId}
          placeholder="Tops – letter"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      {!standard && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Start from</p>
          <div className="flex flex-wrap gap-2">
            {SIZE_STANDARD_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startFromTemplate(template.labels, template.name)}
              >
                {template.name}
              </Button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            A starting point only. Rename, reorder or remove any size to match how you cut.
          </p>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Sizes, smallest first</p>
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sizes yet. Add your first size below.</p>
        ) : (
          <ol className="space-y-1.5">
            {labels.map((label, index) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {label}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Move ${label} up`}
                  disabled={index === FIRST_INDEX}
                  onClick={() => setLabels(moveLabel(labels, index, PREVIOUS_POSITION_STEP))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Move ${label} down`}
                  disabled={index === labels.length - LAST_INDEX_OFFSET}
                  onClick={() => setLabels(moveLabel(labels, index, NEXT_POSITION_STEP))}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Remove ${label}`}
                  onClick={() =>
                    setLabels(labels.filter((existingLabel) => existingLabel !== label))
                  }
                >
                  <X />
                </Button>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-2 flex gap-2">
          <label htmlFor={newLabelInputId} className="sr-only">
            New size
          </label>
          <Input
            id={newLabelInputId}
            placeholder={hasReachedLabelLimit ? "Size limit reached" : "e.g. M or 32"}
            value={newLabel}
            disabled={hasReachedLabelLimit}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={addLabelOnEnter}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addNewLabel}
            disabled={hasReachedLabelLimit}
          >
            Add size
          </Button>
        </div>
      </div>

      {validationMessage && (
        <p role="alert" className="text-xs text-destructive">
          {validationMessage}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void saveStandard()} isLoading={isSaving}>
          {standard ? "Save size standard" : "Create size standard"}
        </Button>
      </div>
    </div>
  );
};
