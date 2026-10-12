import { Badge } from "@outfiqe/design-system";

import { STRETCH_LABEL } from "./sizeChart.utils";

type StretchBadgeProps = {
  isStretchable: boolean | null;
  className?: string;
};

export const StretchBadge = ({ isStretchable, className }: StretchBadgeProps) => {
  if (isStretchable === null) return null;

  return (
    <Badge tone={isStretchable ? "positive" : "neutral"} showDot={false} className={className}>
      {isStretchable ? STRETCH_LABEL.STRETCHABLE : STRETCH_LABEL.NON_STRETCH}
    </Badge>
  );
};
