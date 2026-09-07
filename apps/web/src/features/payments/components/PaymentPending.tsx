import { Loader2 } from "lucide-react";

export const PaymentPending = () => {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center text-center">
      <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden />
      <h1 className="mt-6 font-display text-[28px] font-bold text-foreground">
        Confirming your payment…
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">This only takes a moment.</p>
    </div>
  );
};
