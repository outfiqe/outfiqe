import { Input, Select, Skeleton, StatCard, StatCardSkeleton } from "@outfiqe/design-system";

import { ActionRowSkeleton } from "@/components/ActionRowSkeleton";
import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { ReorderRowSkeleton } from "@/components/ReorderRowSkeleton";
import { ReportRowSkeleton } from "@/components/ReportRowSkeleton";
import { SkeletonButton } from "@/components/SkeletonControls";
import { TableSkeleton } from "@/components/TableSkeleton";
import {
  BadgeCardSkeleton,
  CategoryToggleRowSkeleton,
  TitleActionCardSkeleton,
} from "@/features/gamification/skeletons";

import type {
  AdminPageSkeletonSpec,
  FormCardLayout,
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
const PILL_WIDTH_CLASSES = ["w-20", "w-24", "w-16", "w-28", "w-20"] as const;
const FORM_IMAGE_LABEL = "Upload image";
const DEFAULT_TEXT_LINE_COUNT = 1;
const DEFAULT_ACTION_SIZE = "sm";

const FIELD_WIDTH_CLASS: Record<FormFieldWidth, string> = {
  small: "w-32",
  medium: "w-48",
  large: "w-72 max-w-full",
};

const FORM_CARD_CLASS: Record<FormCardLayout, string> = {
  inline: "flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4",
  stacked: "space-y-5 rounded-xl border border-border bg-card p-5",
  grid: "grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2",
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
        <div className={FORM_CARD_CLASS[block.layout ?? "inline"]} aria-hidden>
          {block.fields.map(({ label, width = "medium", isImage = false }) => (
            <div key={label} className="space-y-1.5">
              <span className="block text-xs text-muted-foreground">{label}</span>
              {isImage ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="size-14 shrink-0 rounded-lg" />
                  <SkeletonButton label={FORM_IMAGE_LABEL} />
                </div>
              ) : (
                <Skeleton className={`h-11 rounded-lg ${FIELD_WIDTH_CLASS[width]}`} />
              )}
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
              textLineCount={block.textLineCount ?? DEFAULT_TEXT_LINE_COUNT}
              hasMetaLine={block.hasMetaLine}
              hasChipRow={block.hasChipRow}
              hasBadge={block.hasBadge}
              hasTrailingBadge={block.hasTrailingBadge}
              leadingImageClass={block.leadingImageClass}
              actions={block.actionLabels.map((label) => ({
                label,
                size: block.actionSize ?? DEFAULT_ACTION_SIZE,
              }))}
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
    case "reorderRows":
      return (
        <div className="space-y-3">
          {Array.from({ length: block.count }, (_unused, rowIndex) => (
            <ReorderRowSkeleton
              key={rowIndex}
              hasImage={block.hasImage}
              actionLabel={block.actionLabel}
            />
          ))}
        </div>
      );
    case "imageRows":
      return (
        <div className="space-y-3">
          {Array.from({ length: block.count }, (_unused, rowIndex) => (
            <CardRowSkeleton
              key={rowIndex}
              textLineCount={1}
              leadingImageClass="size-14"
              actions={block.actionLabels.map((label) => ({ label, size: "default" as const }))}
            />
          ))}
        </div>
      );
    case "pills":
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: block.count }, (_unused, pillIndex) => (
            <Skeleton
              key={pillIndex}
              className={`h-9 rounded-full ${PILL_WIDTH_CLASSES[pillIndex % PILL_WIDTH_CLASSES.length]}`}
            />
          ))}
        </div>
      );
    case "searchInput":
      return (
        <Input
          type="search"
          placeholder={block.placeholder}
          disabled
          aria-hidden
          tabIndex={-1}
          className="max-w-sm"
        />
      );
    case "selectBar":
      return (
        <div className="flex flex-wrap items-center gap-2">
          {block.options.map((optionLabel) => (
            <Select key={optionLabel} disabled aria-hidden tabIndex={-1} className="w-44">
              <option>{optionLabel}</option>
            </Select>
          ))}
        </div>
      );
    case "labeledStats":
      return (
        <div
          className={
            block.isWide
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
              : "grid grid-cols-2 gap-3 sm:grid-cols-4"
          }
          aria-hidden
        >
          {block.labels.map((label) => (
            <StatCard key={label} label={label} value={<Skeleton className="h-7 w-10" />} />
          ))}
        </div>
      );
    case "labeledSelect":
      return (
        <div className="max-w-sm space-y-1.5" aria-hidden>
          <span className="block text-xs text-muted-foreground">{block.label}</span>
          <Select disabled tabIndex={-1}>
            <option>{block.option}</option>
          </Select>
        </div>
      );
    case "posterGrid":
      return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: block.count }, (_unused, posterIndex) => (
            <div key={posterIndex} aria-hidden>
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="mt-2 h-4 w-24" />
              <div className="min-h-[2.25rem]">
                <Skeleton className="mt-1 h-3.5 w-full" />
              </div>
            </div>
          ))}
        </div>
      );
    case "reportRows":
      return (
        <div className="space-y-3">
          {Array.from({ length: block.count }, (_unused, rowIndex) => (
            <ReportRowSkeleton key={rowIndex} hasLeadingName={block.hasLeadingName} />
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
  <div
    role="status"
    aria-label="Loading"
    className={`${SPACING_CLASS[spec.spacing ?? "tight"]}${spec.isNarrow ? " max-w-lg" : ""}`}
  >
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
