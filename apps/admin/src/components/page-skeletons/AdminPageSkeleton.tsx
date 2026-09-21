import { Skeleton, StatCardSkeleton } from "@outfiqe/design-system";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { SkeletonButton } from "@/components/SkeletonControls";
import { TableSkeleton } from "@/components/TableSkeleton";
import {
  BadgeCardSkeleton,
  CategoryToggleRowSkeleton,
  TitleActionCardSkeleton,
} from "@/features/gamification/skeletons";

import type {
  AdminPageSkeletonSpec,
  FormFieldWidth,
  SkeletonBlock,
} from "./adminPageSkeleton.types";

const HEADING_CLASS = "font-display text-2xl font-bold text-foreground";
const SECTION_HEADING_CLASS = "font-display text-lg font-bold text-foreground";
const DESCRIPTION_CLASS = "mt-1 text-sm text-muted-foreground";
const FILTER_TAB_CLASS =
  "rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground";
const FIRST_TAB_INDEX = 0;
const HISTORY_ROW_LINE_COUNT = 2;

const FIELD_WIDTH_CLASS: Record<FormFieldWidth, string> = {
  small: "w-32",
  medium: "w-48",
  large: "w-72 max-w-full",
};

const SPACING_CLASS = { tight: "space-y-6", loose: "space-y-10" } as const;

const BlockSkeleton = ({ block }: { block: SkeletonBlock }) => {
  switch (block.kind) {
    case "filterTabs":
      return (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {block.labels.map((label, labelIndex) => (
              <span
                key={label}
                className={
                  labelIndex === FIRST_TAB_INDEX
                    ? "rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
                    : FILTER_TAB_CLASS
                }
              >
                {label}
              </span>
            ))}
          </div>
          {block.actionLabel && (
            <SkeletonButton size="sm" variant="default" label={block.actionLabel} />
          )}
        </div>
      );
    case "section":
      return (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={SECTION_HEADING_CLASS}>{block.title}</h2>
              {block.description && <p className={DESCRIPTION_CLASS}>{block.description}</p>}
            </div>
            {block.actionLabel && <SkeletonButton size="sm" label={block.actionLabel} />}
          </div>
          <div className="mt-4 space-y-3">
            {block.blocks.map((childBlock, childIndex) => (
              <BlockSkeleton key={childIndex} block={childBlock} />
            ))}
          </div>
        </section>
      );
    case "formCard":
      return (
        <div
          className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
          aria-hidden
        >
          {block.fields.map(({ label, width = "medium" }) => (
            <div key={label} className="space-y-1.5">
              <span className="block text-xs text-muted-foreground">{label}</span>
              <Skeleton className={`h-11 rounded-lg ${FIELD_WIDTH_CLASS[width]}`} />
            </div>
          ))}
          {block.submitLabel && <SkeletonButton variant="default" label={block.submitLabel} />}
        </div>
      );
    case "cardRows":
      return (
        <div className="space-y-3">
          {Array.from({ length: block.count }, (_unused, rowIndex) => (
            <CardRowSkeleton
              key={rowIndex}
              textLineCount={1}
              hasMetaLine={block.hasMetaLine}
              hasChipRow={block.hasChipRow}
              actions={block.actionLabels.map((label) => ({ label, size: "sm" as const }))}
            />
          ))}
        </div>
      );
    case "actionRows":
      return (
        <div className="space-y-3">
          {Array.from({ length: block.count }, (_unused, rowIndex) => (
            <ActionRowSkeleton
              key={rowIndex}
              actionCount={block.actionCount}
              actionLabel={block.actionLabel}
              hasSubLine={block.hasSubLine}
              bodyLineCount={block.bodyLineCount}
            />
          ))}
        </div>
      );
    case "table":
      return <TableSkeleton headers={block.headers} rowCount={block.rowCount} />;
    case "badgeGrid":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: block.count }, (_unused, cardIndex) => (
            <BadgeCardSkeleton key={cardIndex} />
          ))}
        </div>
      );
    case "titleActionGrid":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: block.count }, (_unused, cardIndex) => (
            <TitleActionCardSkeleton key={cardIndex} />
          ))}
        </div>
      );
    case "toggleRows":
      return (
        <div className="space-y-2">
          {Array.from({ length: block.count }, (_unused, rowIndex) => (
            <CategoryToggleRowSkeleton key={rowIndex} />
          ))}
        </div>
      );
    case "historyRows":
      return (
        <div className="space-y-3">
          {Array.from({ length: block.count }, (_unused, rowIndex) => (
            <div key={rowIndex} className="rounded-xl border border-border bg-card p-4" aria-hidden>
              <Skeleton className="h-5 w-80 max-w-full" />
              {Array.from({ length: HISTORY_ROW_LINE_COUNT }, (_line, lineIndex) => (
                <Skeleton key={lineIndex} className="mt-1 h-4 w-full max-w-xl" />
              ))}
            </div>
          ))}
        </div>
      );
    case "statGrid":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: block.count }, (_unused, cardIndex) => (
            <StatCardSkeleton key={cardIndex} />
          ))}
        </div>
      );
  }
};

export const AdminPageSkeleton = ({ spec }: { spec: AdminPageSkeletonSpec }) => (
  <div role="status" aria-label="Loading" className={SPACING_CLASS[spec.spacing ?? "tight"]}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className={HEADING_CLASS}>{spec.title}</h1>
        {spec.description && <p className={DESCRIPTION_CLASS}>{spec.description}</p>}
      </div>
      {spec.headerActionLabel && (
        <SkeletonButton size="sm" variant="default" label={spec.headerActionLabel} />
      )}
    </div>
    {spec.blocks.map((block, blockIndex) => (
      <BlockSkeleton key={blockIndex} block={block} />
    ))}
    <span className="sr-only">Loading page</span>
  </div>
);
