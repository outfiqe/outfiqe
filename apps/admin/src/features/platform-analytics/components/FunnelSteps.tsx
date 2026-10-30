import { percent } from "@/features/financial-rollup/constants/financialRollup.constants";

import type { FunnelStep } from "../api/platformAnalyticsSchemas";
import { FUNNEL_STEP_LABEL } from "../constants/platformAnalytics.constants";
import { toStepShare } from "../utils/platformAnalytics.utils";

type FunnelStepsProps = {
  steps: FunnelStep[];
  emptyMessage: string;
};

const FIRST_STEP_INDEX = 0;
const NO_PEOPLE = 0;
const FULL_BAR_PERCENT = 100;
const PREVIOUS_STEP_OFFSET = 1;

export const FunnelSteps = ({ steps, emptyMessage }: FunnelStepsProps) => {
  const firstStepPersons = steps[FIRST_STEP_INDEX]?.persons ?? NO_PEOPLE;
  if (firstStepPersons === NO_PEOPLE) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-3">
      {steps.map(({ event, persons }, stepIndex) => {
        const previousPersons = steps[stepIndex - PREVIOUS_STEP_OFFSET]?.persons ?? NO_PEOPLE;
        const shareOfFirstStep = toStepShare(persons, firstStepPersons);
        return (
          <li key={event}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{FUNNEL_STEP_LABEL[event] ?? event}</span>
              <span className="tabular-nums text-foreground">
                {persons.toLocaleString()}
                {previousPersons > NO_PEOPLE && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {`${percent(toStepShare(persons, previousPersons))} of previous step`}
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-muted" aria-hidden>
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${shareOfFirstStep * FULL_BAR_PERCENT}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
};
