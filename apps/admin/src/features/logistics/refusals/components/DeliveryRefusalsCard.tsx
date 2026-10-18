import { Badge, Button } from "@outfiqe/design-system";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { useClearCustomerRefusals } from "../hooks/useClearCustomerRefusals";
import { useCustomerRefusals } from "../hooks/useCustomerRefusals";

const NO_REFUSALS = 0;
const MIN_CLEAR_REASON_LENGTH = 5;

type DeliveryRefusalsCardProps = { orderId: string };

export const DeliveryRefusalsCard = ({ orderId }: DeliveryRefusalsCardProps) => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);
  const { data: refusals, isError } = useCustomerRefusals(orderId);
  const clearRefusals = useClearCustomerRefusals(orderId);
  const [isClearing, setIsClearing] = useState(false);

  if (isError || !refusals) return null;
  const { isCashOnDeliveryAllowed, refusalCount, refusalLimit, windowDays } = refusals;

  return (
    <section
      aria-labelledby="delivery-refusals-heading"
      className="mt-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="delivery-refusals-heading"
          className="font-display text-sm font-bold text-foreground"
        >
          Refused deliveries
        </h2>
        <Badge tone={isCashOnDeliveryAllowed ? "positive" : "negative"} showDot={false}>
          {isCashOnDeliveryAllowed ? "Cash on delivery on" : "Cash on delivery off"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {refusalCount} refused in the last {windowDays} days, by this account or phone number. Cash
        on delivery switches off at {refusalLimit}.
      </p>
      {canManage && refusalCount > NO_REFUSALS && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsClearing(true)}>
          Clear refusals
        </Button>
      )}
      <TextPromptModal
        open={isClearing}
        title="Clear refused deliveries"
        description="Only for a genuine reason, such as an emergency. This is written to the audit log."
        label="Why are you clearing them?"
        validate={(reason) =>
          reason.length < MIN_CLEAR_REASON_LENGTH ? "Give a short reason." : null
        }
        confirmLabel="Clear refusals"
        pendingLabel="Clearing…"
        isPending={clearRefusals.isPending}
        onConfirm={(reason) =>
          clearRefusals.mutate(reason, { onSuccess: () => setIsClearing(false) })
        }
        onCancel={() => setIsClearing(false)}
      />
    </section>
  );
};
