import { FormBanner } from "@outfiqe/design-system";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { crmBillingApi } from "./billingApi";
import type { InvoiceVerifyResult } from "./billingSchemas";

const routeApi = getRouteApi("/_authenticated/crm/billing/return");

type VerifyState =
  | { status: "verifying" }
  | { status: "resolved"; outcome: InvoiceVerifyResult["status"] }
  | { status: "error"; message: string };

const OUTCOME_COPY: Record<InvoiceVerifyResult["status"], string> = {
  COMPLETE: "Payment received. Your subscription is active.",
  PENDING: "We haven't received confirmation from the payment provider yet. Check back shortly.",
  FAILED: "The payment did not go through. You can try again from the billing page.",
};

export const BillingReturnPage = () => {
  const { invoiceId } = routeApi.useSearch();
  const [state, setState] = useState<VerifyState>(() =>
    invoiceId
      ? { status: "verifying" }
      : { status: "error", message: "This link is missing an invoice reference." },
  );

  useEffect(() => {
    if (!invoiceId) return;

    crmBillingApi
      .verifyInvoice(invoiceId)
      .then((result) => setState({ status: "resolved", outcome: result.status }))
      .catch((error) =>
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "We couldn't verify this payment.",
        }),
      );
  }, [invoiceId]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>

      <div className="mt-6 space-y-4">
        {state.status === "verifying" && (
          <p className="text-sm text-muted-foreground">Confirming your payment…</p>
        )}
        {state.status === "error" && <FormBanner>{state.message}</FormBanner>}
        {state.status === "resolved" && (
          <FormBanner
            tone={
              state.outcome === "COMPLETE"
                ? "positive"
                : state.outcome === "PENDING"
                  ? "neutral"
                  : "negative"
            }
          >
            {OUTCOME_COPY[state.outcome]}
          </FormBanner>
        )}

        <Link to="/crm/billing" className="text-sm font-semibold text-primary-strong underline">
          Back to billing
        </Link>
      </div>
    </div>
  );
};
