export type SizeStandardLabelView = {
  id: string;
  label: string;
};

export type SizeStandardView = {
  id: string;
  name: string;
  labels: SizeStandardLabelView[];
};

export type OwnedSizeStandardLabel = SizeStandardLabelView & {
  sortOrder: number;
};
