"use client";

import type { SidebarNavItem } from "@outfiqe/components";
import { Button, Modal } from "@outfiqe/design-system";
import { useDragReorder } from "@outfiqe/hooks";
import { ArrowDown, ArrowUp, GripVertical, Lock, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/shared/lib/cn";

import { PINNED_SLOT_COUNT } from "./dashboardMobileNav";

type DashboardNavCustomizeSheetProps = {
  allItems: SidebarNavItem[];
  pinnedIds: string[];
  onSave: (ids: string[]) => void;
  onReset: () => void;
  onClose: () => void;
};

export const DashboardNavCustomizeSheet = ({
  allItems,
  pinnedIds,
  onSave,
  onReset,
  onClose,
}: DashboardNavCustomizeSheetProps) => {
  const itemById = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [allItems]);

  const [draft, setDraft] = useState<string[]>(() => pinnedIds.filter((id) => itemById.has(id)));

  const pinned = draft
    .map((id) => itemById.get(id))
    .filter((item): item is SidebarNavItem => item !== undefined);
  const available = allItems.filter((item) => !draft.includes(item.id));
  const isFull = draft.length >= PINNED_SLOT_COUNT;

  const { getDragProps, moveEntry, draggingId, dragOverId } = useDragReorder({
    order: draft,
    getId: (id) => id,
    onReorder: setDraft,
  });

  const addItem = (id: string) =>
    setDraft((current) => (current.length >= PINNED_SLOT_COUNT ? current : [...current, id]));
  const removeItem = (id: string) => setDraft((current) => current.filter((entry) => entry !== id));

  return (
    <Modal
      open
      onClose={onClose}
      title="Customize navigation"
      description="Pick the four shortcuts in your bottom bar. The menu button in the center stays put."
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Reset to default
          </button>
          <Button onClick={() => onSave(draft)} disabled={draft.length !== PINNED_SLOT_COUNT}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            In your bar · {draft.length}/{PINNED_SLOT_COUNT}
          </h3>

          <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-muted-foreground">
            <Lock className="size-4 shrink-0" />
            <span className="flex-1 text-sm font-medium">Menu button</span>
            <span className="text-xs">Always centered</span>
          </div>

          {pinned.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Add four from the list below.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {pinned.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.id}
                    {...getDragProps(item.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 transition-colors",
                      draggingId === item.id && "opacity-50",
                      dragOverId === item.id && "border-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </span>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label={`Move ${item.label} up`}
                        disabled={index === 0}
                        onClick={() => moveEntry(index, index - 1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label={`Move ${item.label} down`}
                        disabled={index === pinned.length - 1}
                        onClick={() => moveEntry(index, index + 1)}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                    {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Remove ${item.label}`}
                      onClick={() => removeItem(item.id)}
                    >
                      <X />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {available.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Available
            </h3>
            {isFull && (
              <p className="mt-1 text-xs text-muted-foreground">Remove one to add another.</p>
            )}
            <ul className="mt-2 space-y-1.5">
              {available.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {item.label}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      aria-label={`Add ${item.label}`}
                      disabled={isFull}
                      onClick={() => addItem(item.id)}
                    >
                      <Plus className="size-4" />
                      Add
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
};
