import {
  emailButtonHtml,
  emailEyebrow,
  emailHeading,
  emailLede,
  emailMetaTable,
  emailStatusPill,
  emailText,
  renderEmailLayout,
} from "./layout.js";

type OrderConfirmationInput = {
  orderId: string;
  total: number;
  paymentMethod: string;
};

export const orderConfirmationTemplate = (
  input: OrderConfirmationInput,
): { subject: string; html: string } => ({
  subject: `Order placed: ${input.orderId}`,
  html: renderEmailLayout({
    preheader: `Your Outfiqe order ${input.orderId} has been placed.`,
    bodyHtml: `
      ${emailEyebrow("Order")}
      ${emailHeading("Order placed")}
      ${emailLede("We've got your order and it's being prepared.")}
      ${emailMetaTable([
        { label: "Order ID", value: input.orderId },
        { label: "Amount", value: `Rs. ${input.total.toLocaleString()}` },
        { label: "Payment method", value: input.paymentMethod },
      ])}
    `,
  }),
});

type NewOrderNotificationInput = {
  orderId: string;
  total: number;
};

export const newOrderNotificationTemplate = (
  input: NewOrderNotificationInput,
): { subject: string; html: string } => ({
  subject: `New order: ${input.orderId}`,
  html: renderEmailLayout({
    preheader: `A new order came in.`,
    bodyHtml: `
      ${emailEyebrow("New order")}
      ${emailHeading("New order")}
      ${emailMetaTable([
        { label: "Order ID", value: input.orderId },
        { label: "Amount", value: `Rs. ${input.total.toLocaleString()}` },
      ])}
    `,
  }),
});

type PaymentSettledInput = {
  orderId: string;
  total: number;
};

export const paymentSettledTemplate = (
  input: PaymentSettledInput,
): { subject: string; html: string } => ({
  subject: `Payment received: ${input.orderId}`,
  html: renderEmailLayout({
    preheader: `Payment received for order ${input.orderId}.`,
    bodyHtml: `
      ${emailStatusPill("Payment received", "success")}
      ${emailHeading("Payment received")}
      ${emailMetaTable([
        { label: "Order ID", value: input.orderId },
        { label: "Amount", value: `Rs. ${input.total.toLocaleString()}` },
      ])}
    `,
  }),
});

type ManualRefundNeededInput = {
  orderId: string;
  total: number;
};

export const manualRefundNeededTemplate = (
  input: ManualRefundNeededInput,
): { subject: string; html: string } => ({
  subject: `Action needed: refund order ${input.orderId}`,
  html: renderEmailLayout({
    preheader: `Order ${input.orderId} needs a manual refund.`,
    bodyHtml: `
      ${emailStatusPill("Action needed", "destructive")}
      ${emailHeading("Manual refund needed")}
      ${emailText("This order was paid but the item sold out before we could confirm it. Refund it by hand through the gateway dashboard.")}
      ${emailMetaTable([
        { label: "Order ID", value: input.orderId },
        { label: "Amount", value: `Rs. ${input.total.toLocaleString()}` },
      ])}
    `,
  }),
});

type OrderCancelledInput = {
  orderId: string;
  total: number;
  refunded: boolean;
};

export const orderCancelledTemplate = (
  input: OrderCancelledInput,
): { subject: string; html: string } => ({
  subject: `Order cancelled: ${input.orderId}`,
  html: renderEmailLayout({
    preheader: `Order ${input.orderId} has been cancelled.`,
    bodyHtml: `
      ${emailStatusPill("Cancelled", "destructive")}
      ${emailHeading("Order cancelled")}
      ${emailMetaTable([
        { label: "Order ID", value: input.orderId },
        { label: "Amount", value: `Rs. ${input.total.toLocaleString()}` },
        ...(input.refunded ? [{ label: "Refund", value: "Refunded to you" }] : []),
      ])}
    `,
  }),
});

type RefundFailedInput = {
  orderId: string;
  total: number;
};

export const refundFailedTemplate = (
  input: RefundFailedInput,
): { subject: string; html: string } => ({
  subject: `Action needed: refund order ${input.orderId}`,
  html: renderEmailLayout({
    preheader: `The automatic refund for order ${input.orderId} failed.`,
    bodyHtml: `
      ${emailStatusPill("Action needed", "destructive")}
      ${emailHeading("Automatic refund failed")}
      ${emailText("This order was cancelled, but the automatic gateway refund failed. Refund it by hand.")}
      ${emailMetaTable([
        { label: "Order ID", value: input.orderId },
        { label: "Amount", value: `Rs. ${input.total.toLocaleString()}` },
      ])}
    `,
  }),
});

type WithdrawRequestReceivedInput = {
  ownerName: string;
  ownerType: string;
  amount: number;
  reviewUrl: string;
};

export const withdrawRequestReceivedInternalTemplate = (
  input: WithdrawRequestReceivedInput,
): { subject: string; html: string } => ({
  subject: `New withdrawal request: Rs. ${input.amount} (${input.ownerName})`,
  html: renderEmailLayout({
    preheader: `${input.ownerName} requested a withdrawal of Rs. ${input.amount}.`,
    bodyHtml: `
      ${emailEyebrow("Withdrawal request")}
      ${emailHeading(`Rs. ${input.amount.toLocaleString()}`)}
      ${emailMetaTable([
        { label: "From", value: input.ownerName },
        { label: "Type", value: input.ownerType },
        { label: "Amount", value: `Rs. ${input.amount.toLocaleString()}` },
      ])}
      ${emailButtonHtml("Review in admin panel", input.reviewUrl)}
    `,
  }),
});
