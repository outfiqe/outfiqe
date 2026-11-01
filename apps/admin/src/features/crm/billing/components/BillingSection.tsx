import {
  Badge,
  Button,
  Checkbox,
  ConfirmModal,
  FormBanner,
  Table,
  type TableColumn,
} from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { BillingSkeleton } from "../../components/CrmSkeletons";
import { CrmTermHint } from "../../components/CrmTermHint";
import { CRM_TERMS } from "../../constants/crmTerms";
import { useCrmPermissions } from "../../hooks/useCrmPermissions";
import { formatDate, formatRupees, toPlainWords } from "../../utils/format.utils";
import { toTrialLabel } from "../../utils/trial.utils";
import { crmBillingApi } from "../api/billingApi";
import {
  type BillingOverview,
  type SubscriptionInvoice,
  type SubscriptionStatusValue,
} from "../api/billingSchemas";
import { INVOICE_STATUS_TONE } from "../constants/invoiceStatusTone";
import { toPlanStatusSentence, toSeatUsage } from "../utils/billingStatus.utils";
import { InvoicePanel } from "./InvoicePanel";
import { PlanCheckoutModal } from "./PlanCheckoutModal";
import { PlanComparison } from "./PlanComparison";

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

const INVOICE_COLUMNS: TableColumn<SubscriptionInvoice>[] = [
  {
    key: "period",
    header: "Period",
    render: ({ periodStart, periodEnd }) => `${formatDate(periodStart)} – ${formatDate(periodEnd)}`,
  },
  { key: "amount", header: "Amount", render: ({ amount }) => formatRupees(amount) },
  {
    key: "status",
    header: "Status",
    render: ({ status }) => (
      <Badge tone={INVOICE_STATUS_TONE[status]}>{toPlainWords(status)}</Badge>
    ),
  },
  { key: "paid", header: "Paid", render: ({ paidAt }) => (paidAt ? formatDate(paidAt) : "—") },
];

const SubscriptionCard = ({
  overview,
  trialEndsAt,
  onManagePlan,
  onPayInvoice,
}: {
  overview: BillingOverview;
  trialEndsAt: string | null;
  onManagePlan: (planId?: string) => void;
  onPayInvoice: (invoice: SubscriptionInvoice) => void;
}) => {
  const { subscription, planCatalog, activeSeatCount } = overview;

  const [showVoidedInvoices, setShowVoidedInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const {
    data: invoicePages,
    fetchNextPage: fetchMoreInvoices,
    hasNextPage: hasMoreInvoices,
    isFetchingNextPage: isFetchingMoreInvoices,
  } = useInfiniteQuery({
    queryKey: [...BILLING_INVOICES_KEY, showVoidedInvoices],
    queryFn: ({ pageParam }) => crmBillingApi.listInvoices(pageParam, showVoidedInvoices),
    initialPageParam: undefined as string | undefined,
    placeholderData: keepPreviousData,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const invoices = invoicePages?.pages.flatMap((page) => page.invoices) ?? [];

  const cancelRenewal = useApiMutation({
    mutationFn: crmBillingApi.cancel,
    invalidateKeys: [BILLING_OVERVIEW_KEY],
    onSuccess: () => setIsConfirmingCancel(false),
    onError: () => setIsConfirmingCancel(false),
  });

  const planName =
    planCatalog.find((plan) => plan.id === subscription?.plan)?.name ?? subscription?.plan ?? "—";
  const outstandingInvoice = invoices.find((invoice) => invoice.status === "OPEN");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        {subscription ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">{planName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {toPlanStatusSentence(subscription)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <CrmTermHint
                    term={toSeatUsage(activeSeatCount, subscription.seats)}
                    tip={CRM_TERMS.seat}
                  />{" "}
                  ·{" "}
                  <Link to="/crm" className="font-medium text-foreground underline">
                    Manage your team
                  </Link>
                </p>
              </div>
              <Badge tone={SUBSCRIPTION_STATUS_TONE[subscription.status]}>
                {toPlainWords(subscription.status)}
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onManagePlan()}>
                Change plan or seats
              </Button>
              {subscription.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && (
                <Button size="sm" variant="outline" onClick={() => setIsConfirmingCancel(true)}>
                  Cancel renewal
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display text-lg font-bold text-foreground">Free trial</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {overview.advancedFeaturesEnabled
                ? "Every CRM feature is included during your trial. Subscribe to keep them."
                : "Your trial has ended. Subscribe to use the sales board, opportunities, tickets and reports."}
              {trialEndsAt && ` ${toTrialLabel(trialEndsAt)}.`}
            </p>
            <Button size="sm" className="mt-4" onClick={() => onManagePlan()}>
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

      <div>
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={showVoidedInvoices}
            onChange={(event) => setShowVoidedInvoices(event.target.checked)}
          />
          Show voided invoices
        </label>
        <InvoiceHistory invoices={invoices} onSelectInvoice={setSelectedInvoice} />
        {hasMoreInvoices && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            isLoading={isFetchingMoreInvoices}
            onClick={() => fetchMoreInvoices()}
          >
            Load more
          </Button>
        )}
      </div>

      <PlanComparison
        plans={planCatalog}
        currentPlanId={subscription?.plan ?? null}
        onChoosePlan={onManagePlan}
      />

      {selectedInvoice && (
        <InvoicePanel
          invoice={selectedInvoice}
          planName={
            planCatalog.find((plan) => plan.id === selectedInvoice.plan)?.name ??
            selectedInvoice.plan
          }
          onClose={() => setSelectedInvoice(null)}
          onPay={(invoice) => {
            setSelectedInvoice(null);
            onPayInvoice(invoice);
          }}
        />
      )}

      <ConfirmModal
        open={isConfirmingCancel}
        title="Cancel renewal?"
        description={`Your plan stays active until ${
          subscription ? formatDate(subscription.currentPeriodEnd) : "the end of this period"
        }. After that it won't renew, and your team loses the sales board, tickets and reports.`}
        confirmLabel="Cancel renewal"
        pendingLabel="Cancelling…"
        destructive
        isPending={cancelRenewal.isPending}
        onConfirm={() => cancelRenewal.mutate()}
        onCancel={() => setIsConfirmingCancel(false)}
      />
    </div>
  );
};

const InvoiceHistory = ({
  invoices,
  onSelectInvoice,
}: {
  invoices: SubscriptionInvoice[];
  onSelectInvoice: (invoice: SubscriptionInvoice) => void;
}) => {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>;
  }

  return (
    <Table
      caption="Invoices"
      columns={INVOICE_COLUMNS}
      rows={invoices}
      rowKey={({ id }) => id}
      onRowClick={onSelectInvoice}
    />
  );
};

export const BillingSection = () => {
  const {
    data: overview,
    isLoading,
    error,
  } = useQuery({ queryKey: BILLING_OVERVIEW_KEY, queryFn: crmBillingApi.getOverview });

  const { organization } = useCrmPermissions();
  const [checkoutInvoiceId, setCheckoutInvoiceId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [chosenPlanId, setChosenPlanId] = useState<string | null>(null);

  if (isLoading) {
    return <BillingSkeleton />;
  }

  if (error || !overview) {
    return <FormBanner>{getErrorMessage(error)}</FormBanner>;
  }

  const currentPlanId =
    chosenPlanId ?? overview.subscription?.plan ?? overview.planCatalog[0]?.id ?? "";
  const currentSeats = Math.max(overview.subscription?.seats ?? 1, overview.activeSeatCount);

  return (
    <div>
      <SubscriptionCard
        overview={overview}
        trialEndsAt={organization?.trialEndsAt ?? null}
        onManagePlan={(planId) => {
          setChosenPlanId(planId ?? null);
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
