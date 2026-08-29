export const DEFAULT_PIPELINE_STAGES: {
  name: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
}[] = [
  { name: "Lead", sortOrder: 0, isWon: false, isLost: false },
  { name: "Contacted", sortOrder: 1, isWon: false, isLost: false },
  { name: "Negotiating", sortOrder: 2, isWon: false, isLost: false },
  { name: "Won", sortOrder: 3, isWon: true, isLost: false },
  { name: "Lost", sortOrder: 4, isWon: false, isLost: true },
];

export const MIN_PIPELINE_STAGES = 2;

export const MAX_PIPELINE_STAGES = 20;

export const MAX_DEALS_PAGE_SIZE = 200;
