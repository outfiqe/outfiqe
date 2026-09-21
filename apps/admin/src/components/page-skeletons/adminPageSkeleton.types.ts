export type FormFieldWidth = "small" | "medium" | "large";

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
  | { kind: "formCard"; fields: readonly SkeletonFormField[]; submitLabel?: string }
  | {
      kind: "cardRows";
      count: number;
      actionLabels: readonly string[];
      hasMetaLine?: boolean;
      hasChipRow?: boolean;
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
  | { kind: "text"; text: string }
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
  blocks: readonly SkeletonBlock[];
  sourceFiles: readonly string[];
};
