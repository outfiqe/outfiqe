import {
  emailButtonHtml,
  emailDivider,
  emailEyebrow,
  emailHeading,
  emailInfoPanel,
  emailLede,
  emailMetaTable,
  emailMuted,
  emailSecurityNote,
  emailStatusPill,
  emailSubheading,
  emailText,
  escapeHtml,
  paragraphsHtml,
  renderEmailLayout,
} from "./layout.js";

export const verifyEmailTemplate = (url: string): { subject: string; html: string } => ({
  subject: "Verify your Outfiqe account",
  html: renderEmailLayout({
    preheader: "Verify your email to start using Outfiqe.",
    bodyHtml: `
      ${emailEyebrow("Account")}
      ${emailHeading("Welcome to Outfiqe")}
      ${emailLede("Confirm this is your email address to finish setting up your account.")}
      ${emailButtonHtml("Verify email", url)}
      ${emailSecurityNote("If you didn't create an Outfiqe account, you can safely ignore this email.")}
    `,
  }),
});

export const passwordResetTemplate = (url: string): { subject: string; html: string } => ({
  subject: "Reset your Outfiqe password",
  html: renderEmailLayout({
    preheader: "Reset your Outfiqe password.",
    bodyHtml: `
      ${emailEyebrow("Account")}
      ${emailHeading("Reset your password")}
      ${emailLede("This link expires in 1 hour.")}
      ${emailButtonHtml("Reset password", url)}
      ${emailSecurityNote("If you didn't request this, you can safely ignore this email — your password won't change.")}
    `,
  }),
});

type BrandApplicationReceivedInput = {
  brandName: string;
  contactName: string;
  email: string;
  phone: string;
  instagram: string;
  makesOwnPieces: string;
  reviewUrl: string;
};

export const brandApplicationReceivedInternalTemplate = (
  input: BrandApplicationReceivedInput,
): { subject: string; html: string } => ({
  subject: `New brand application: ${input.brandName}`,
  html: renderEmailLayout({
    preheader: `${input.brandName} applied to list on Outfiqe.`,
    bodyHtml: `
      ${emailEyebrow("New application")}
      ${emailHeading(input.brandName)}
      ${emailMetaTable([
        { label: "Contact", value: input.contactName },
        { label: "Email", value: input.email },
        { label: "Phone", value: input.phone },
        { label: "Instagram", value: input.instagram },
        { label: "Makes own pieces", value: input.makesOwnPieces },
      ])}
      ${emailButtonHtml("Review in admin panel", input.reviewUrl)}
    `,
  }),
});

export const brandApprovedTemplate = (
  brandName: string,
  inviteUrl: string,
): { subject: string; html: string } => ({
  subject: `You're approved — set up ${brandName} on Outfiqe`,
  html: renderEmailLayout({
    preheader: `${brandName} is approved on Outfiqe.`,
    bodyHtml: `
      ${emailStatusPill("Approved", "success")}
      ${emailHeading(`${brandName} is approved`)}
      ${emailLede("Set up your account to start listing. This link expires in 7 days.")}
      ${emailButtonHtml("Set up your account", inviteUrl)}
    `,
  }),
});

export const brandRejectedTemplate = (
  brandName: string,
  reason?: string,
): { subject: string; html: string } => ({
  subject: `About your Outfiqe application for ${brandName}`,
  html: renderEmailLayout({
    preheader: "An update on your Outfiqe application.",
    bodyHtml: `
      ${emailHeading("Not quite a fit right now")}
      ${emailText(`We looked at ${brandName} and it isn't a fit for Outfiqe at the moment.`)}
      ${reason ? paragraphsHtml(reason) : emailMuted("You're welcome to apply again in the future.")}
    `,
  }),
});

export const creatorApprovedTemplate = (): { subject: string; html: string } => ({
  subject: "You're an approved Outfiqe creator",
  html: renderEmailLayout({
    preheader: "You're approved as an Outfiqe creator.",
    bodyHtml: `
      ${emailStatusPill("Approved", "success")}
      ${emailHeading("You're in")}
      ${emailLede("Your creator account is approved. You can now post fits and tag products.")}
    `,
  }),
});

export const creatorRejectedTemplate = (): { subject: string; html: string } => ({
  subject: "About your Outfiqe creator application",
  html: renderEmailLayout({
    preheader: "An update on your creator application.",
    bodyHtml: `
      ${emailHeading("Not quite a fit right now")}
      ${emailLede("Your creator application isn't a fit at the moment. You're welcome to apply again later.")}
    `,
  }),
});

export const productApprovedTemplate = (
  productName: string,
): { subject: string; html: string } => ({
  subject: `${productName} is live on Outfiqe`,
  html: renderEmailLayout({
    preheader: `${productName} is now live on Outfiqe.`,
    bodyHtml: `
      ${emailStatusPill("Approved", "success")}
      ${emailHeading(`${productName} is live`)}
      ${emailLede("Your listing is approved and now visible to shoppers.")}
    `,
  }),
});

export const productRejectedTemplate = (
  productName: string,
): { subject: string; html: string } => ({
  subject: `About your listing for ${productName}`,
  html: renderEmailLayout({
    preheader: "An update on your product listing.",
    bodyHtml: `
      ${emailHeading("Not quite ready to list")}
      ${emailLede(`${productName} wasn't approved this time. You're welcome to update it and resubmit.`)}
    `,
  }),
});

type OrderConfirmationInput = {
  orderId: string;
  total: number;
  paymentMethod: string;
};

export const orderConfirmationTemplate = (
  input: OrderConfirmationInput,
): { subject: string; html: string } => ({
  subject: `Order placed — ${input.orderId}`,
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
  subject: `Payment received — ${input.orderId}`,
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
  subject: `Action needed — refund order ${input.orderId}`,
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
  subject: `Order cancelled — ${input.orderId}`,
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
  subject: `Action needed — refund order ${input.orderId}`,
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

export const adminInviteTemplate = (
  name: string,
  inviteUrl: string,
): { subject: string; html: string } => ({
  subject: "You've been invited to administer Outfiqe",
  html: renderEmailLayout({
    preheader: "You've been invited as an Outfiqe admin.",
    bodyHtml: `
      ${emailEyebrow("Admin invite")}
      ${emailHeading(`Hi ${name}`)}
      ${emailLede("You've been invited to the Outfiqe admin panel. This link expires in 7 days.")}
      ${emailButtonHtml("Set up your admin account", inviteUrl)}
    `,
  }),
});

export const crmOrganizationInviteTemplate = (
  roleName: string,
  inviteUrl: string,
): { subject: string; html: string } => ({
  subject: "You've been invited to the Outfiqe CRM",
  html: renderEmailLayout({
    preheader: "You've been invited to the Outfiqe CRM.",
    bodyHtml: `
      ${emailEyebrow("CRM invite")}
      ${emailHeading("You're invited")}
      ${emailLede(`You've been granted "${roleName}" access to the Outfiqe CRM. This link expires in 7 days.`)}
      ${emailButtonHtml("Accept invite", inviteUrl)}
    `,
  }),
});

export const crmOwnershipTransferRequestTemplate = (
  organizationName: string,
  crmUrl: string,
): { subject: string; html: string } => ({
  subject: `You've been asked to become the owner of ${organizationName}`,
  html: renderEmailLayout({
    preheader: `You've been asked to become the owner of ${organizationName} on the Outfiqe CRM.`,
    bodyHtml: `
      ${emailEyebrow("CRM")}
      ${emailHeading("Ownership transfer requested")}
      ${emailLede(`The current owner of "${organizationName}" wants to make you its owner on the Outfiqe CRM. Sign in and open the CRM to accept or decline.`)}
      ${emailButtonHtml("Open CRM", crmUrl)}
    `,
  }),
});

export const crmSubscriptionRenewalDueTemplate = (
  organizationName: string,
  amount: number,
  billingUrl: string,
): { subject: string; html: string } => ({
  subject: `Your ${organizationName} CRM subscription is due for renewal`,
  html: renderEmailLayout({
    preheader: `Renew the ${organizationName} CRM subscription to keep advanced features.`,
    bodyHtml: `
      ${emailStatusPill("Renewal due", "neutral")}
      ${emailHeading("Renewal due")}
      ${emailLede("Renew to keep pipeline, deals, tickets and reporting available for your team.")}
      ${emailMetaTable([
        { label: "Organization", value: organizationName },
        { label: "Amount due", value: `Rs. ${amount.toLocaleString()}` },
      ])}
      ${emailButtonHtml("Review billing", billingUrl)}
    `,
  }),
});

type SupportEmailInput = {
  reference: string;
  subject: string;
};

export const supportRequestReceivedTemplate = (
  input: SupportEmailInput & { message: string },
): { subject: string; html: string } => ({
  subject: `[${input.reference}] We've got your request`,
  html: renderEmailLayout({
    preheader: `We've received your support request ${input.reference}.`,
    bodyHtml: `
      ${emailEyebrow(input.reference)}
      ${emailHeading("We're on it")}
      ${emailLede("Thanks for reaching out. Our team will reply by email — you can also follow this in your account under Settings > Support.")}
      ${emailSubheading(input.subject)}
      ${emailInfoPanel(paragraphsHtml(input.message))}
    `,
  }),
});

export const supportStaffReplyTemplate = (
  input: SupportEmailInput & { reply: string; threadUrl: string },
): { subject: string; html: string } => ({
  subject: `[${input.reference}] ${input.subject}`,
  html: renderEmailLayout({
    preheader: `A reply on your support request ${input.reference}.`,
    bodyHtml: `
      ${emailEyebrow(input.reference)}
      ${emailHeading("Outfiqe Support replied")}
      ${emailInfoPanel(paragraphsHtml(input.reply))}
      ${emailButtonHtml("View the thread", input.threadUrl)}
      ${emailMuted("Reply to this email or open the thread to respond.")}
    `,
  }),
});

export const staleShipmentReminderTemplate = (input: {
  brandName: string;
  shipmentCount: number;
  ordersUrl: string;
}): { subject: string; html: string } => {
  const noun = input.shipmentCount === 1 ? "shipment" : "shipments";
  return {
    subject: `${input.shipmentCount} ${noun} waiting to be marked delivered`,
    html: renderEmailLayout({
      preheader: `Mark your shipped orders as delivered.`,
      bodyHtml: `
        ${emailEyebrow("Orders")}
        ${emailHeading("Confirm your deliveries")}
        ${emailText(
          `${escapeHtml(input.brandName)} has ${input.shipmentCount} ${noun} that shipped over a week ago but aren't marked delivered yet. Marking them keeps buyers informed and releases your payout for those items.`,
        )}
        ${emailButtonHtml("Open your orders", input.ordersUrl)}
      `,
    }),
  };
};

export const supportResolvedTemplate = (
  input: SupportEmailInput & { reopenUrl: string },
): { subject: string; html: string } => ({
  subject: `[${input.reference}] Marked resolved`,
  html: renderEmailLayout({
    preheader: `Your support request ${input.reference} was marked resolved.`,
    bodyHtml: `
      ${emailStatusPill("Resolved", "success")}
      ${emailHeading("Marked resolved")}
      ${emailText(
        `We've marked "${escapeHtml(input.reference)}" (${escapeHtml(input.subject)}) resolved. If this didn't fully sort things out, you can reopen it within 14 days.`,
      )}
      ${emailButtonHtml("Reopen this request", input.reopenUrl)}
    `,
  }),
});

type AccountSuspendedInput = {
  reason: string;
  expiresAtLabel: string | null;
  supportUrl: string;
};

export const accountSuspendedTemplate = (
  input: AccountSuspendedInput,
): { subject: string; html: string } => ({
  subject: "Your Outfiqe account has been suspended",
  html: renderEmailLayout({
    preheader: "Your account has been temporarily suspended.",
    bodyHtml: `
      ${emailStatusPill("Suspended", "destructive")}
      ${emailHeading("Your account has been suspended")}
      ${emailLede(
        input.expiresAtLabel
          ? `This is temporary and lifts automatically on ${input.expiresAtLabel}.`
          : "This suspension has no set end date.",
      )}
      ${paragraphsHtml(input.reason)}
      ${emailDivider()}
      ${emailText("If you think this is a mistake, you can reach our support team.")}
      ${emailButtonHtml("Contact support", input.supportUrl)}
    `,
  }),
});

type AccountBannedInput = {
  reason: string;
  supportUrl: string;
};

export const accountBannedTemplate = (
  input: AccountBannedInput,
): { subject: string; html: string } => ({
  subject: "Your Outfiqe account has been banned",
  html: renderEmailLayout({
    preheader: "Your account has been banned.",
    bodyHtml: `
      ${emailStatusPill("Banned", "destructive")}
      ${emailHeading("Your account has been banned")}
      ${paragraphsHtml(input.reason)}
      ${emailDivider()}
      ${emailText("If you think this is a mistake, you can reach our support team.")}
      ${emailButtonHtml("Contact support", input.supportUrl)}
    `,
  }),
});

export const accountRestoredTemplate = (): { subject: string; html: string } => ({
  subject: "Your Outfiqe account is active again",
  html: renderEmailLayout({
    preheader: "Your account access has been restored.",
    bodyHtml: `
      ${emailStatusPill("Restored", "success")}
      ${emailHeading("Welcome back")}
      ${emailLede("Your account is active again and everything is back to normal.")}
    `,
  }),
});

type BrandSuspendedInput = {
  brandName: string;
  reason: string;
  expiresAtLabel: string | null;
  supportUrl: string;
};

export const brandSuspendedTemplate = (
  input: BrandSuspendedInput,
): { subject: string; html: string } => ({
  subject: `${input.brandName} has been suspended on Outfiqe`,
  html: renderEmailLayout({
    preheader: "Your brand's storefront has been temporarily suspended.",
    bodyHtml: `
      ${emailStatusPill("Suspended", "destructive")}
      ${emailHeading(`${escapeHtml(input.brandName)} has been suspended`)}
      ${emailLede(
        `Your listings are hidden from the storefront and order fulfilment is paused. ${
          input.expiresAtLabel
            ? `This is temporary and lifts automatically on ${input.expiresAtLabel}.`
            : "This suspension has no set end date."
        }`,
      )}
      ${paragraphsHtml(input.reason)}
      ${emailDivider()}
      ${emailText("If you think this is a mistake, you can reach our support team.")}
      ${emailButtonHtml("Contact support", input.supportUrl)}
    `,
  }),
});

export const brandRestoredTemplate = (brandName: string): { subject: string; html: string } => ({
  subject: `${brandName} is active again on Outfiqe`,
  html: renderEmailLayout({
    preheader: "Your brand's storefront access has been restored.",
    bodyHtml: `
      ${emailStatusPill("Restored", "success")}
      ${emailHeading("Welcome back")}
      ${emailLede(`${escapeHtml(brandName)} is active again — listings are visible and fulfilment can resume.`)}
    `,
  }),
});
