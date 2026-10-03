import type { CommissionScopeValue } from "./schemas";

export const COMMISSION_SCOPE_COPY: Record<
  CommissionScopeValue,
  { title: string; description: string }
> = {
  CREATOR_LOOK: {
    title: "Creator Look commission",
    description:
      "Fixed commission a creator earns when someone buys from their post or link, by the sold item's price band.",
  },
  OUTFIT_BUILD: {
    title: "Build commission",
    description:
      "Fixed commission for a sale from a build, by the sold item's price band. It is split equally between everyone on the build; a brand's share goes to its payout balance.",
  },
};
