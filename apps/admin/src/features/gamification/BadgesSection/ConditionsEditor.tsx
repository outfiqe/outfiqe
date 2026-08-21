import { Button, Input, Select } from "@outfiqe/design-system";

import type { AchievementMetricValue, ConditionOperatorValue } from "../schemas";
import { EMPTY_CONDITION, METRIC_OPTIONS, OPERATOR_OPTIONS } from "./badgeForm.constants";
import type { ConditionFormState } from "./badgeForm.types";

export const ConditionsEditor = ({
  idPrefix,
  conditions,
  onChange,
}: {
  idPrefix: string;
  conditions: ConditionFormState[];
  onChange: (conditions: ConditionFormState[]) => void;
}) => (
  <div className="space-y-2">
    <p className="text-xs text-muted-foreground">
      Conditions (all must be met — metric ≥/&gt;/=/≤/&lt; value)
    </p>
    {conditions.map((condition, index) => (
      <div key={index} className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${idPrefix}-metric-${index}`} className="sr-only">
          Metric
        </label>
        <Select
          id={`${idPrefix}-metric-${index}`}
          value={condition.metric}
          onChange={(e) =>
            onChange(
              conditions.map((c, i) =>
                i === index ? { ...c, metric: e.target.value as AchievementMetricValue } : c,
              ),
            )
          }
          className="w-40"
        >
          {METRIC_OPTIONS.map((metric) => (
            <option key={metric} value={metric}>
              {metric}
            </option>
          ))}
        </Select>
        <label htmlFor={`${idPrefix}-operator-${index}`} className="sr-only">
          Operator
        </label>
        <Select
          id={`${idPrefix}-operator-${index}`}
          value={condition.operator}
          onChange={(e) =>
            onChange(
              conditions.map((c, i) =>
                i === index ? { ...c, operator: e.target.value as ConditionOperatorValue } : c,
              ),
            )
          }
          className="w-20"
        >
          {OPERATOR_OPTIONS.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </Select>
        <label htmlFor={`${idPrefix}-value-${index}`} className="sr-only">
          Value
        </label>
        <Input
          id={`${idPrefix}-value-${index}`}
          type="number"
          required
          value={condition.value}
          onChange={(e) =>
            onChange(conditions.map((c, i) => (i === index ? { ...c, value: e.target.value } : c)))
          }
          className="w-28"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={conditions.length <= 1}
          onClick={() => onChange(conditions.filter((_, i) => i !== index))}
        >
          Remove
        </Button>
      </div>
    ))}
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => onChange([...conditions, { ...EMPTY_CONDITION }])}
    >
      Add condition
    </Button>
  </div>
);
