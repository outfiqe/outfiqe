export const PaymentPending = () => {
  return (
    <div role="status" aria-live="polite">
      <h1 className="font-display text-[28px] font-bold text-foreground">
        Confirming your payment…
      </h1>
      <p className="mt-2.5 text-sm text-muted-foreground">This only takes a moment.</p>
    </div>
  );
};
