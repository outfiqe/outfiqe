import { cn } from "./cn";

export function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
