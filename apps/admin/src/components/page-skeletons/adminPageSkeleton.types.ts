export type FormFieldWidth = "small" | "medium" | "large";

export type StatCardColumns = "four" | "five" | "six";

export type SkeletonInfoCard = {
  title?: string;
  description?: string;
  rowCount: number;
};

export type FormCardLayout = "inline" | "stacked" | "grid";

export type SkeletonFormField = {
  label: string;
  width?: FormFieldWidth;
  isImage?: boolean;
};

export type SkeletonBlock =
  | { kind: "filterTabs"; labels: readonly string[]; actionLabel?: string }
  | {
      kind: "section";
      title: string;
      description?: string;
      actionLabel?: string;
      blocks: readonly SkeletonBlock[];
    }
  | {
      kind: "formCard";
      fields: readonly SkeletonFormField[];
      submitLabel?: string;
      layout?: FormCardLayout;
    }
  | {
      kind: "cardRows";
      count: number;
      actionLabels: readonly string[];
      hasMetaLine?: boolean;
      hasChipRow?: boolean;
      hasBadge?: boolean;
      hasTrailingBadge?: boolean;
      textLineCount?: number;
      leadingImageClass?: string;
      actionSize?: "default" | "sm";
    }
  | {
      kind: "actionRows";
      count: number;
      actionCount?: number;
      actionLabel?: string;
      hasSubLine?: boolean;
      bodyLineCount?: number;
    }
  | { kind: "reorderRows"; count: number; hasImage?: boolean; actionLabel?: string }
  | { kind: "imageRows"; count: number; actionLabels: readonly string[] }
  | { kind: "pills"; count: number }
  | { kind: "searchInput"; placeholder: string }
  | { kind: "selectBar"; options: readonly string[] }
  | { kind: "labeledStats"; labels: readonly string[]; isWide?: boolean }
  | { kind: "labeledSelect"; label: string; option: string }
  | { kind: "statCards"; count: number; columns: StatCardColumns; hasDelta?: boolean }
  | { kind: "tiles"; labels: readonly string[]; title?: string }
  | { kind: "chartCard"; title: string; description: string }
  | { kind: "infoCards"; cards: readonly SkeletonInfoCard[] }
  | { kind: "bar" }
  | { kind: "posterGrid"; count: number }
  | { kind: "reportRows"; count: number; hasLeadingName?: boolean }
  | { kind: "table"; headers: readonly string[]; rowCount?: number }
  | { kind: "badgeGrid"; count: number }
  | { kind: "titleActionGrid"; count: number }
  | { kind: "toggleRows"; count: number }
  | { kind: "historyRows"; count: number }
  | { kind: "statGrid"; count: number };

export type AdminPageSkeletonSpec = {
  title: string;
  description?: string;
  headerActionLabel?: string;
  spacing?: "tight" | "loose";
  isNarrow?: boolean;
  blocks: readonly SkeletonBlock[];
  sourceFiles: readonly string[];
};
