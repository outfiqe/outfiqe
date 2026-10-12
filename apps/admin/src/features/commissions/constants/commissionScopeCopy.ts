import type { CommissionScopeValue } from "../api/commissionsSchemas";

export const COMMISSION_SCOPE_COPY: Record<
  CommissionScopeValue,
  { title: string; description: string }
> = {
  CREATOR_LOOK: {
    title: "Drop commission",
    description:
      "Fixed commission a muse earns when someone buys from their drop or link, by the sold item's price band.",
  },
  OUTFIT_BUILD: {
    title: "Build commission",
    description:
      "Fixed commission for a sale from a build, by the sold item's price band. It is split equally between everyone on the build; a brand's share goes to its payout balance.",
  },
};
