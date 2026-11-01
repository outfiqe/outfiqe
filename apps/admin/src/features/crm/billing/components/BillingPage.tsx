import { CrmPageHeader } from "../../components/CrmPageHeader";
import { CRM_PAGE_TEXT } from "../../constants/crmPageContent";
import { BillingSection } from "./BillingSection";

export const BillingPage = () => (
  <div>
    <CrmPageHeader {...CRM_PAGE_TEXT.billing} />
    <div className="mt-6">
      <BillingSection />
    </div>
  </div>
);
