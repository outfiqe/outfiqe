"use client";

import { Button, Modal } from "@outfiqe/design-system";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { PublicCategory } from "@/features/categories/api/categorySchemas";

type CustomizeTasteModalProps = {
  allCategories: PublicCategory[];
  selectedSlugs: string[];
  onSave: (slugs: string[]) => void;
  onReset: () => void;
  onClose: () => void;
};

const withSwappedNeighbours = (slugs: string[], from: number, to: number): string[] => {
  const next = [...slugs];
  const moved = next[from];
  const displaced = next[to];
  if (!moved || !displaced) return slugs;
  next[from] = displaced;
  next[to] = moved;
  return next;
};

export const CustomizeTasteModal = ({
  allCategories,
  selectedSlugs,
  onSave,
  onReset,
  onClose,
}: CustomizeTasteModalProps) => {
  const bySlug = useMemo(
    () => new Map(allCategories.map((category) => [category.slug, category])),
    [allCategories],
  );

  const [draft, setDraft] = useState<string[]>(() =>
    selectedSlugs.filter((slug) => bySlug.has(slug)),
  );

  const shown = draft
    .map((slug) => bySlug.get(slug))
    .filter((category): category is PublicCategory => category !== undefined);
  const available = allCategories.filter((category) => !draft.includes(category.slug));

  const add = (slug: string) => setDraft((current) => [...current, slug]);
  const remove = (slug: string) => setDraft((current) => current.filter((s) => s !== slug));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= draft.length) return;
    setDraft((current) => withSwappedNeighbours(current, from, to));
  };

  const save = () => {
    onSave(draft);
    onClose();
  };

  const reset = () => {
    onReset();
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Customize your taste"
      description="Choose which looks show on your home page, and the order they appear in."
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Reset to default
          </button>
          <Button onClick={save} disabled={draft.length === 0}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            On your home page · {shown.length}
          </h3>
          {shown.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Add at least one from the list below.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {shown.map((category, index) => (
                <li
                  key={category.slug}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5"
                >
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={`Move ${category.name} up`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={`Move ${category.name} down`}
                      disabled={index === shown.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {category.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Remove ${category.name}`}
                    onClick={() => remove(category.slug)}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {available.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              More looks
            </h3>
            <ul className="mt-2 space-y-1.5">
              {available.map((category) => (
                <li key={category.slug} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {category.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    aria-label={`Add ${category.name}`}
                    onClick={() => add(category.slug)}
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
};
