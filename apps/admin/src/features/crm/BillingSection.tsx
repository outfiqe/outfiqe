import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmBillingApi } from "./billingApi";
import {
  type BillingOverview,
  type InvoiceStatusValue,
  type SubscriptionInvoice,
  type SubscriptionStatusValue,
} from "./billingSchemas";
import { formatDate, formatRupees } from "./format.utils";
import { PlanCheckoutModal } from "./PlanCheckoutModal";

const BILLING_OVERVIEW_KEY = ["crm-billing-overview"];
const BILLING_INVOICES_KEY = ["crm-billing-invoices"];

const SUBSCRIPTION_STATUS_TONE: Record<
  SubscriptionStatusValue,
  "neutral" | "positive" | "negative"
> = {
  TRIALING: "neutral",
  ACTIVE: "positive",
  PAST_DUE: "negative",
  CANCELED: "negative",
};

const INVOICE_STATUS_TONE: Record<InvoiceStatusValue, "neutral" | "positive" | "negative"> = {
  OPEN: "neutral",
  PAID: "positive",
  VOID: "negative",
};

const SubscriptionCard = ({
  overview,
  onManagePlan,
  onPayInvoice,
}: {
  overview: BillingOverview;
  onManagePlan: () => void;
  onPayInvoice: (invoice: SubscriptionInvoice) => void;
}) => {
  const queryClient = useQueryClient();
  const { subscription, planCatalog, activeSeatCount } = overview;

  const { data: invoicePage } = useQuery({
    queryKey: BILLING_INVOICES_KEY,
    queryFn: () => crmBillingApi.listInvoices(),
  });

  const cancelRenewal = useMutation({
    mutationFn: crmBillingApi.cancel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BILLING_OVERVIEW_KEY }),
  });

  const planName =
    planCatalog.find((plan) => plan.id === subscription?.plan)?.name ?? subscription?.plan ?? "—";
  const outstandingInvoice = invoicePage?.invoices.find((invoice) => invoice.status === "OPEN");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        {subscription ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{planName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {subscription.seats} seats · {activeSeatCount} in use · renews{" "}
                  {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
              <Badge tone={SUBSCRIPTION_STATUS_TONE[subscription.status]}>
                {subscription.status.replace("_", " ").toLowerCase()}
              </Badge>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <p className="mt-3 text-sm text-muted-foreground">
                This subscription will not renew after {formatDate(subscription.currentPeriodEnd)}.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={onManagePlan}>
                Change plan or seats
              </Button>
              {subscription.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cancelRenewal.isPending}
                  onClick={() => cancelRenewal.mutate()}
                >
                  {cancelRenewal.isPending ? "Cancelling…" : "Cancel renewal"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display text-lg font-bold text-foreground">Free trial</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {overview.advancedFeaturesEnabled
                ? "Advanced CRM features are available during your trial. Subscribe to keep them."
                : "Your trial has ended. Subscribe to use pipeline, deals, tickets and reporting."}
            </p>
            <Button size="sm" className="mt-4" onClick={onManagePlan}>
              Subscribe
            </Button>
          </>
        )}

        {cancelRenewal.isError && (
          <FormBanner className="mt-3">{getErrorMessage(cancelRenewal.error)}</FormBanner>
        )}
      </div>

      {outstandingInvoice && (
        <FormBanner tone="neutral">
          You have an unpaid invoice for {formatRupees(outstandingInvoice.amount)} (
          {formatDate(outstandingInvoice.periodStart)} – {formatDate(outstandingInvoice.periodEnd)}
          ).{" "}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => onPayInvoice(outstandingInvoice)}
          >
            Pay now
          </button>
        </FormBanner>
      )}

      <InvoiceHistory invoices={invoicePage?.invoices ?? []} />
    </div>
  );
};

const InvoiceHistory = ({ invoices }: { invoices: SubscriptionInvoice[] }) => {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">Period</th>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Paid</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-t border-border">
              <td className="py-2 pr-4">
                {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
              </td>
              <td className="py-2 pr-4">{formatRupees(invoice.amount)}</td>
              <td className="py-2 pr-4">
                <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>
                  {invoice.status.toLowerCase()}
                </Badge>
              </td>
              <td className="py-2">{invoice.paidAt ? formatDate(invoice.paidAt) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const BillingSection = () => {
  const {
    data: overview,
    isLoading,
    error,
  } = useQuery({ queryKey: BILLING_OVERVIEW_KEY, queryFn: crmBillingApi.getOverview });

  const [checkoutInvoiceId, setCheckoutInvoiceId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !overview) {
    return <FormBanner>{getErrorMessage(error)}</FormBanner>;
  }

  const currentPlanId = overview.subscription?.plan ?? overview.planCatalog[0]?.id ?? "";
  const currentSeats = Math.max(overview.subscription?.seats ?? 1, overview.activeSeatCount);

  return (
    <div>
      <SubscriptionCard
        overview={overview}
        onManagePlan={() => {
          setCheckoutInvoiceId(null);
          setCheckoutOpen(true);
        }}
        onPayInvoice={(invoice) => {
          setCheckoutInvoiceId(invoice.id);
          setCheckoutOpen(true);
        }}
      />

      {checkoutOpen && (
        <PlanCheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          planCatalog={overview.planCatalog}
          activeSeatCount={overview.activeSeatCount}
          initialPlanId={currentPlanId}
          initialSeats={currentSeats}
          payExistingInvoiceId={checkoutInvoiceId}
        />
      )}
    </div>
  );
};
