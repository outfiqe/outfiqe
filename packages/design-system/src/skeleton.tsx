import { cn } from "./cn";

export const Skeleton = ({ className, ...props }: React.ComponentPropsWithoutRef<"div">) => {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
};
