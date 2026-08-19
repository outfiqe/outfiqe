import { cn } from "./cn";

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

export interface ProgressBarProps extends React.ComponentPropsWithoutRef<"div"> {
  value: number;
  max: number;
  label: string;
  trackClassName?: string;
  fillClassName?: string;
}

export const ProgressBar = ({
  value,
  max,
  label,
  className,
  trackClassName,
  fillClassName,
  ...props
}: ProgressBarProps) => {
  const percent =
    max > MIN_PERCENT
      ? Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, (value / max) * MAX_PERCENT))
      : MIN_PERCENT;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={MIN_PERCENT}
      aria-valuemax={max}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", trackClassName, className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width]", fillClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};
