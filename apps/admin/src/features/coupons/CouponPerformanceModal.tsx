import { Modal, StatCard, StatCardSkeleton } from "@outfiqe/design-system";

import { useCouponPerformance } from "./hooks/useCouponPerformance";
import type { Coupon } from "./schemas";

type CouponPerformanceModalProps = {
  coupon: Coupon | null;
  onClose: () => void;
};

const formatRs = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const PERFORMANCE_STAT_COUNT = 8;
const NET_MARGIN_STAT_INDEX = 4;

export const CouponPerformanceModal = ({ coupon, onClose }: CouponPerformanceModalProps) => {
  const { data: performance, isLoading } = useCouponPerformance(coupon?.id ?? null);

  if (!coupon) return null;

  return (
    <Modal open title={`Performance — ${coupon.code}`} onClose={onClose}>
      {isLoading && (
        <div className="grid grid-cols-2 gap-3" role="status" aria-label="Loading">
          {Array.from({ length: PERFORMANCE_STAT_COUNT }, (_unused, statIndex) => (
            <StatCardSkeleton key={statIndex} hasDelta={statIndex === NET_MARGIN_STAT_INDEX} />
          ))}
        </div>
      )}
      {performance && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Redemptions" value={performance.redemptionCount} />
          <StatCard label="GMV driven" value={formatRs(performance.totalGmv)} />
          <StatCard label="Discount spend" value={formatRs(performance.totalDiscountAmount)} />
          <StatCard
            label="Platform fee collected"
            value={formatRs(performance.totalPlatformFeeCollected)}
          />
          <StatCard
            label="Net margin"
            value={formatRs(performance.netMargin)}
            delta={{
              value: performance.netMargin >= 0 ? "Profitable" : "Subsidized",
              tone: performance.netMargin >= 0 ? "positive" : "negative",
            }}
          />
          <StatCard
            label="New vs. returning"
            value={`${performance.newCustomerCount} / ${performance.returningCustomerCount}`}
          />
          <StatCard label="Repeat within 30d" value={performance.repeatPurchaseWithin30dCount} />
          <StatCard label="Repeat within 90d" value={performance.repeatPurchaseWithin90dCount} />
        </div>
      )}
    </Modal>
  );
};
