import { BillingSection } from "./BillingSection";
import { CRM_PAGE_TEXT } from "./crmPageContent";

export const BillingPage = () => (
  <div>
    <h1 className="font-display text-2xl font-bold text-foreground">
      {CRM_PAGE_TEXT.billing.title}
    </h1>
    <p className="mt-1 text-sm text-muted-foreground">{CRM_PAGE_TEXT.billing.description}</p>
    <div className="mt-6">
      <BillingSection />
    </div>
  </div>
);
