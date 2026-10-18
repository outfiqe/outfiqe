import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { PAY_COUNTRY_CODE } from "../constants/riderPayLabels";
import { RiderEarningsSection } from "./RiderEarningsSection";
import { RiderPayRateSection } from "./RiderPayRateSection";

export const RiderPayPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManage = canUse(PLATFORM_MANAGE_PERMISSION.LOGISTICS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Rider pay</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What contractor riders earn per visit. Each earning is held for 7 days, then riders can
          withdraw it to their bank. Employees are paid salary outside Outfiqe.
        </p>
      </div>
      <RiderPayRateSection countryCode={PAY_COUNTRY_CODE} canManage={canManage} />
      <RiderEarningsSection canManage={canManage} />
    </div>
  );
};
