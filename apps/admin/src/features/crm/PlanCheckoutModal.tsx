import { Button, FormBanner, Input, Modal, Select } from "@outfiqe/design-system";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { crmBillingApi } from "./billingApi";
import {
  CRM_BILLING_PROVIDER,
  type CrmBillingProviderValue,
  type PlanDefinition,
} from "./billingSchemas";
import { redirectToPaymentGateway } from "./paymentRedirect";

type PlanCheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  planCatalog: PlanDefinition[];
  activeSeatCount: number;
  initialPlanId: string;
  initialSeats: number;
  payExistingInvoiceId: string | null;
};

const PROVIDER_LABEL: Record<CrmBillingProviderValue, string> = {
  [CRM_BILLING_PROVIDER.ESEWA]: "eSewa",
  [CRM_BILLING_PROVIDER.KHALTI]: "Khalti",
};

const toProvider = (value: string): CrmBillingProviderValue =>
  value === CRM_BILLING_PROVIDER.KHALTI ? CRM_BILLING_PROVIDER.KHALTI : CRM_BILLING_PROVIDER.ESEWA;

export const PlanCheckoutModal = ({
  open,
  onClose,
  planCatalog,
  activeSeatCount,
  initialPlanId,
  initialSeats,
  payExistingInvoiceId,
}: PlanCheckoutModalProps) => {
  const [planId, setPlanId] = useState(initialPlanId);
  const [seats, setSeats] = useState(initialSeats);
  const [provider, setProvider] = useState<CrmBillingProviderValue>(CRM_BILLING_PROVIDER.ESEWA);

  const selectedPlan = planCatalog.find((plan) => plan.id === planId) ?? planCatalog[0];
  const minSeats = Math.max(selectedPlan?.minSeats ?? 1, activeSeatCount);
  const estimatedTotal = (selectedPlan?.pricePerSeatPerMonth ?? 0) * seats;

  const startPayment = useMutation({
    mutationFn: () =>
      payExistingInvoiceId
        ? crmBillingApi.payInvoice(payExistingInvoiceId, provider)
        : crmBillingApi.checkout({ plan: planId, seats, provider }),
    onSuccess: redirectToPaymentGateway,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startPayment.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={payExistingInvoiceId ? "Pay outstanding invoice" : "Choose a plan"}
    >
      <form onSubmit={submit} className="space-y-4">
        {!payExistingInvoiceId && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="billing-plan" className="text-xs text-muted-foreground">
                Plan
              </label>
              <Select
                id="billing-plan"
                value={planId}
                onChange={(event) => {
                  setPlanId(event.target.value);
                  const nextPlan = planCatalog.find((plan) => plan.id === event.target.value);
                  if (nextPlan) setSeats(Math.max(nextPlan.minSeats, activeSeatCount));
                }}
              >
                {planCatalog.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — Rs. {plan.pricePerSeatPerMonth.toLocaleString()} / seat / month
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="billing-seats" className="text-xs text-muted-foreground">
                Seats (at least {minSeats} — you have {activeSeatCount} active member
                {activeSeatCount === 1 ? "" : "s"})
              </label>
              <Input
                id="billing-seats"
                type="number"
                min={minSeats}
                max={selectedPlan?.maxSeats}
                value={seats}
                onChange={(event) => setSeats(Number(event.target.value))}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Estimated monthly total: Rs. {estimatedTotal.toLocaleString()}
            </p>
          </>
        )}

        <div className="space-y-1.5">
          <label htmlFor="billing-provider" className="text-xs text-muted-foreground">
            Pay with
          </label>
          <Select
            id="billing-provider"
            value={provider}
            onChange={(event) => setProvider(toProvider(event.target.value))}
          >
            {Object.values(CRM_BILLING_PROVIDER).map((value) => (
              <option key={value} value={value}>
                {PROVIDER_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>

        {startPayment.isError && <FormBanner>{getErrorMessage(startPayment.error)}</FormBanner>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={startPayment.isPending || seats < minSeats}>
            {startPayment.isPending ? "Starting…" : "Continue to payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
