import { Skeleton } from "@outfiqe/design-system";

const SHIMMER_CLASS = "skeleton-shimmer animate-none";

type ShimmerBlockProps = {
  className?: string;
};

export const ShimmerBlock = ({ className = "" }: ShimmerBlockProps) => (
  <Skeleton className={`${SHIMMER_CLASS} ${className}`} />
);
