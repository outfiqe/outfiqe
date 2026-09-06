import { Badge, Button, ProgressBar, toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { couponsApi } from "./api";
import { CouponPerformanceModal } from "./CouponPerformanceModal";
import { CreateCouponModal } from "./CreateCouponModal";
import { useInfiniteCoupons } from "./hooks/useInfiniteCoupons";
import type { Coupon, CouponStatusValue } from "./schemas";

const TABS: CouponStatusValue[] = ["ACTIVE", "PAUSED", "ARCHIVED"];

const STATUS_TONE: Record<CouponStatusValue, "neutral" | "positive" | "negative"> = {
  ACTIVE: "positive",
  PAUSED: "neutral",
  ARCHIVED: "negative",
};

const describeAmount = (coupon: Coupon): string => {
  if (coupon.type === "PERCENT") {
    const percent = (coupon.percentBasisPoints ?? 0) / 100;
    return coupon.maxDiscountAmount
      ? `${percent}% off, up to Rs. ${coupon.maxDiscountAmount.toLocaleString()}`
      : `${percent}% off`;
  }
  return `Rs. ${(coupon.fixedAmount ?? 0).toLocaleString()} off`;
};

export const CouponsListSection = () => {
  const [tab, setTab] = useState<CouponStatusValue>("ACTIVE");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [performanceCoupon, setPerformanceCoupon] = useState<Coupon | null>(null);
  const queryClient = useQueryClient();

  const {
    data: couponsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCoupons(tab);
  const coupons = couponsQuery?.pages.flatMap((page) => page.coupons) ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CouponStatusValue }) =>
      couponsApi.updateStatus(id, status),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const approve = useMutation({
    mutationFn: (id: string) => couponsApi.approve(id),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const updateBudget = useMutation({
    mutationFn: ({ id, totalBudgetAmount }: { id: string; totalBudgetAmount: number | null }) =>
      couponsApi.updateBudget(id, { totalBudgetAmount, maxRedemptions: null }),
    onSuccess: invalidate,
    onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
  });

  const isActing = updateStatus.isPending || approve.isPending || updateBudget.isPending;

  const handleEditBudget = (coupon: Coupon) => {
    const input = window.prompt(
      "New total budget in Rs. (leave blank for uncapped):",
      coupon.totalBudgetAmount?.toString() ?? "",
    );
    if (input === null) return;
    const totalBudgetAmount = input.trim() === "" ? null : Number(input);
    if (totalBudgetAmount !== null && Number.isNaN(totalBudgetAmount)) return;
    updateBudget.mutate({ id: coupon.id, totalBudgetAmount });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((status) => (
            <button
              key={status}
              onClick={() => setTab(status)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === status
                  ? "bg-foreground text-background"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          New coupon
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load coupons.</p>}
        {!isLoading && coupons.length === 0 && (
          <p className="text-sm text-muted-foreground">No coupons here yet.</p>
        )}

        {coupons.map((coupon) => {
          const pendingApproval = coupon.requiresApproval && coupon.approvedById === null;

          return (
            <div key={coupon.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-foreground">
                      {coupon.code}
                    </h3>
                    <Badge tone={STATUS_TONE[coupon.status]} showDot={false}>
                      {coupon.status}
                    </Badge>
                    {pendingApproval && (
                      <Badge tone="negative" showDot={false}>
                        Pending approval
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {describeAmount(coupon)} · {coupon.redemptionCount.toLocaleString()} redeemed
                    {coupon.maxRedemptions
                      ? ` / ${coupon.maxRedemptions.toLocaleString()} max`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pendingApproval && (
                    <Button size="sm" onClick={() => approve.mutate(coupon.id)} disabled={isActing}>
                      Approve
                    </Button>
                  )}
                  {!pendingApproval && coupon.status !== "ARCHIVED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatus.mutate({
                          id: coupon.id,
                          status: coupon.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                        })
                      }
                      disabled={isActing}
                    >
                      {coupon.status === "ACTIVE" ? "Pause" : "Activate"}
                    </Button>
                  )}
                  {coupon.status !== "ARCHIVED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: coupon.id, status: "ARCHIVED" })}
                      disabled={isActing}
                    >
                      Archive
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleEditBudget(coupon)}>
                    Edit budget
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPerformanceCoupon(coupon)}>
                    Performance
                  </Button>
                </div>
              </div>

              {coupon.totalBudgetAmount !== null && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Rs. {coupon.spentAmount.toLocaleString()} of Rs.{" "}
                      {coupon.totalBudgetAmount.toLocaleString()} spent
                    </span>
                    <span>{coupon.budgetUtilizationPercent ?? 0}%</span>
                  </div>
                  <ProgressBar
                    label={`${coupon.code} budget utilization`}
                    value={coupon.spentAmount}
                    max={coupon.totalBudgetAmount}
                    fillClassName={
                      (coupon.budgetUtilizationPercent ?? 0) >= 95 ? "bg-destructive" : undefined
                    }
                  />
                </div>
              )}
            </div>
          );
        })}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>

      <CreateCouponModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={invalidate}
      />
      <CouponPerformanceModal
        coupon={performanceCoupon}
        onClose={() => setPerformanceCoupon(null)}
      />
    </div>
  );
};
