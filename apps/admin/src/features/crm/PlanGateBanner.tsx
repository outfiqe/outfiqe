import { FormBanner } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

const GATED_CAPABILITIES = "pipeline, deals, tickets and reporting";

export const PlanGateBanner = ({
  advancedFeaturesEnabled,
}: {
  advancedFeaturesEnabled: boolean;
}) => {
  if (advancedFeaturesEnabled) return null;

  return (
    <FormBanner tone="neutral" className="mb-4">
      Your trial has ended. Subscribe to keep using {GATED_CAPABILITIES}.{" "}
      <Link to="/crm/billing" className="font-semibold underline">
        Go to billing
      </Link>
    </FormBanner>
  );
};
