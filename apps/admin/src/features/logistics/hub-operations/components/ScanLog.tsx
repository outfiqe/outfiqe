import { CheckCircle2, CircleAlert, TriangleAlert } from "lucide-react";

import { SCAN_OUTCOME, type ScanLogEntry, type ScanOutcome } from "../constants/scanOutcomes";

const OUTCOME_ICON = {
  [SCAN_OUTCOME.DONE]: CheckCircle2,
  [SCAN_OUTCOME.NEEDS_ATTENTION]: TriangleAlert,
  [SCAN_OUTCOME.REFUSED]: CircleAlert,
};

const OUTCOME_CLASS: Record<ScanOutcome, string> = {
  [SCAN_OUTCOME.DONE]: "text-primary-strong",
  [SCAN_OUTCOME.NEEDS_ATTENTION]: "text-amber-600",
  [SCAN_OUTCOME.REFUSED]: "text-destructive",
};

const NO_SCANS = 0;

type ScanLogProps = { entries: ScanLogEntry[]; emptyMessage: string };

export const ScanLog = ({ entries, emptyMessage }: ScanLogProps) => (
  <section aria-labelledby="scan-log-heading" className="space-y-2">
    <h2 id="scan-log-heading" className="text-sm font-semibold text-foreground">
      This session
    </h2>
    {entries.length === NO_SCANS ? (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    ) : (
      <ul className="space-y-2" aria-live="polite">
        {entries.map(({ id, outcome, title, detail }) => {
          const OutcomeIcon = OUTCOME_ICON[outcome];
          return (
            <li key={id} className="flex gap-3 rounded-xl border border-border bg-card p-3 text-sm">
              <OutcomeIcon
                aria-hidden
                className={`mt-0.5 size-4 shrink-0 ${OUTCOME_CLASS[outcome]}`}
              />
              <div>
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-muted-foreground">{detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
