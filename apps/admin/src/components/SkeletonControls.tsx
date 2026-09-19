import { Badge, Button } from "@outfiqe/design-system";

const PLACEHOLDER_CLASS = "skeleton-pill animate-pulse disabled:opacity-100";

type SkeletonBadgeProps = {
  label?: string;
};

export const SkeletonBadge = ({ label = "Status" }: SkeletonBadgeProps) => (
  <Badge
    tone="neutral"
    showDot={false}
    className={PLACEHOLDER_CLASS}
    aria-hidden
    data-label={label}
  />
);

type SkeletonButtonProps = {
  label?: string;
  size?: "default" | "sm";
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

export const SkeletonButton = ({
  label = "Action",
  size = "default",
  variant = "outline",
  className = "",
}: SkeletonButtonProps) => (
  <Button
    variant={variant}
    size={size}
    disabled
    tabIndex={-1}
    aria-hidden
    className={`${PLACEHOLDER_CLASS} ${className}`}
    data-label={label}
  />
);
