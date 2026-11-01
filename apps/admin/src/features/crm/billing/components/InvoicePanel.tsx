import { Badge, Button, Drawer, DrawerScrollArea } from "@outfiqe/design-system";

import { MetricRow } from "@/components/MetricParts";

import { formatDate, formatRupees, toPlainWords } from "../../utils/format.utils";
import type { SubscriptionInvoice } from "../api/billingSchemas";
import { INVOICE_STATUS_TONE } from "../constants/invoiceStatusTone";
import { PROVIDER_LABELS } from "../constants/providerLabels";

const OPEN_INVOICE_STATUS = "OPEN";

export const InvoicePanel = ({
  invoice,
  planName,
  onClose,
  onPay,
}: {
  invoice: SubscriptionInvoice;
  planName: string;
  onClose: () => void;
  onPay: (invoice: SubscriptionInvoice) => void;
}) => {
  const { amount, status, seats, periodStart, periodEnd, provider, paidAt, voidedAt } = invoice;

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Invoice for ${formatRupees(amount)}`}
      footer={
        status === OPEN_INVOICE_STATUS && (
          <div className="px-5 py-3">
            <Button size="sm" onClick={() => onPay(invoice)}>
              Pay this invoice
            </Button>
          </div>
        )
      }
    >
      <DrawerScrollArea className="p-5">
        <MetricRow
          label="Status"
          value={<Badge tone={INVOICE_STATUS_TONE[status]}>{toPlainWords(status)}</Badge>}
        />
        <MetricRow label="Plan" value={planName} />
        <MetricRow label="Seats" value={seats.toLocaleString()} />
        <MetricRow label="Covers" value={`${formatDate(periodStart)} – ${formatDate(periodEnd)}`} />
        {provider && <MetricRow label="Paid through" value={PROVIDER_LABELS[provider]} />}
        {paidAt && <MetricRow label="Paid on" value={formatDate(paidAt)} />}
        {voidedAt && <MetricRow label="Cancelled on" value={formatDate(voidedAt)} />}
      </DrawerScrollArea>
    </Drawer>
  );
};
