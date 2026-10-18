export const SCAN_OUTCOME = {
  DONE: "done",
  NEEDS_ATTENTION: "needs-attention",
  REFUSED: "refused",
} as const;

export type ScanOutcome = (typeof SCAN_OUTCOME)[keyof typeof SCAN_OUTCOME];

export type ScanLogEntry = {
  id: string;
  outcome: ScanOutcome;
  title: string;
  detail: string;
};
