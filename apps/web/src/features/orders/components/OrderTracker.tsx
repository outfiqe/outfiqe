import { cn } from "@/shared/lib/cn";

import { FulfilmentStatus, type FulfilmentStatusValue } from "../api/orderSchemas";

const FLOW: FulfilmentStatusValue[] = [
  FulfilmentStatus.PLACED,
  FulfilmentStatus.PACKED,
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
];

const FLOW_LABELS: Record<string, string> = {
  [FulfilmentStatus.PLACED]: "Order placed",
  [FulfilmentStatus.PACKED]: "Packed",
  [FulfilmentStatus.SHIPPED]: "On the way",
  [FulfilmentStatus.DELIVERED]: "Delivered",
};

type OrderTrackerProps = {
  fulfilmentStatus: FulfilmentStatusValue;
};

export const OrderTracker = ({ fulfilmentStatus }: OrderTrackerProps) => {
  if (fulfilmentStatus === FulfilmentStatus.CANCELLED) {
    return <p className="text-sm font-medium text-destructive">This order was cancelled.</p>;
  }

  const currentStep = FLOW.indexOf(fulfilmentStatus);

  return (
    <div className="relative flex justify-between">
      <div className="absolute left-[5%] right-[5%] top-[11px] h-px bg-border" />
      {FLOW.map((step, index) => (
        <div
          key={step}
          className="relative z-10 flex-1 text-center"
          aria-current={step === fulfilmentStatus ? "step" : undefined}
        >
          <div
            className={cn(
              "mx-auto mb-2 flex size-[22px] items-center justify-center rounded-full border-2 bg-background",
              index <= currentStep ? "border-primary bg-primary" : "border-border",
            )}
          >
            {index <= currentStep && (
              <span className="size-1.5 rounded-full bg-primary-foreground" />
            )}
          </div>
          <p
            className={cn(
              "text-[11px]",
              index <= currentStep ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {FLOW_LABELS[step]}
          </p>
        </div>
      ))}
    </div>
  );
};
