import { Button } from "@outfiqe/design-system";

import { cn } from "@/shared/lib/cn";

type LoadErrorNoticeProps = {
  message: string;
  onRetry: () => void;
  align?: "start" | "center";
  className?: string;
};

export const LoadErrorNotice = ({
  message,
  onRetry,
  align = "start",
  className,
}: LoadErrorNoticeProps) => (
  <div
    role="alert"
    className={cn(
      "flex flex-col gap-3",
      align === "center" ? "items-center text-center" : "items-start",
      className,
    )}
  >
    <p className="text-sm text-muted-foreground">{message}</p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Try again
    </Button>
  </div>
);
