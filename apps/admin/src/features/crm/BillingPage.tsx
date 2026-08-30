import { BillingSection } from "./BillingSection";

export const BillingPage = () => (
  <div className="mx-auto max-w-3xl">
    <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
    <p className="mt-1 text-sm text-muted-foreground">
      Manage the plan, seats and payment history for this organization&apos;s CRM subscription.
    </p>
    <div className="mt-6">
      <BillingSection />
    </div>
  </div>
);
