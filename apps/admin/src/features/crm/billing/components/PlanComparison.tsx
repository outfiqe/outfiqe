import { Badge, Button } from "@outfiqe/design-system";

import { MetricSection } from "@/components/MetricParts";

import { formatRupees } from "../../utils/format.utils";
import type { PlanDefinition } from "../api/billingSchemas";

const ADVANCED_PLAN_INCLUDES = "Everything: sales board, tickets, tasks and reports.";
const BASIC_PLAN_INCLUDES = "The basics: partners, customers and contacts.";

export const PlanComparison = ({
  plans,
  currentPlanId,
  onChoosePlan,
}: {
  plans: PlanDefinition[];
  currentPlanId: string | null;
  onChoosePlan: (planId: string) => void;
}) => (
  <MetricSection title="Compare plans" description="You pay for each person using the CRM.">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map(
        ({ id, name, pricePerSeatPerMonth, minSeats, maxSeats, unlocksAdvancedFeatures }) => (
          <div key={id} className="flex flex-col rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground">{name}</h3>
              {id === currentPlanId && <Badge tone="positive">Your plan</Badge>}
            </div>
            <p className="mt-2 text-sm text-foreground">
              {formatRupees(pricePerSeatPerMonth)} a seat each month
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {minSeats} to {maxSeats} seats
            </p>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              {unlocksAdvancedFeatures ? ADVANCED_PLAN_INCLUDES : BASIC_PLAN_INCLUDES}
            </p>
            {id !== currentPlanId && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 self-start"
                onClick={() => onChoosePlan(id)}
              >
                Choose {name}
              </Button>
            )}
          </div>
        ),
      )}
    </div>
  </MetricSection>
);
