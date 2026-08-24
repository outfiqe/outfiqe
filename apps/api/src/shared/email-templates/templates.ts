import { emailButtonHtml, renderEmailLayout, SUB } from "./layout.js";

export const verifyEmailTemplate = (url: string): { subject: string; html: string } => ({
  subject: "Verify your Outfiqe account",
  html: renderEmailLayout({
    preheader: "Verify your email to start using Outfiqe.",
    bodyHtml: `
      <h1 style="font-size:20px;margin:0 0 4px;">Welcome to Outfiqe</h1>
      <p style="color:${SUB};margin:0;">Confirm this is your email address to finish setting up your account.</p>
      ${emailButtonHtml("Verify email", url)}
    `,
  }),
});

export const passwordResetTemplate = (url: string): { subject: string; html: string } => ({
  subject: "Reset your Outfiqe password",
  html: renderEmailLayout({
    preheader: "Reset your Outfiqe password.",
    bodyHtml: `
      <h1 style="font-size:20px;margin:0 0 4px;">Reset your password</h1>
      <p style="color:${SUB};margin:0;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      ${emailButtonHtml("Reset password", url)}
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
      <h1 style="font-size:20px;margin:0 0 12px;">${input.brandName}</h1>
      <p style="margin:4px 0;"><strong>Contact:</strong> ${input.contactName}</p>
      <p style="margin:4px 0;"><strong>Email:</strong> ${input.email}</p>
      <p style="margin:4px 0;"><strong>Phone:</strong> ${input.phone}</p>
      <p style="margin:4px 0;"><strong>Instagram:</strong> ${input.instagram}</p>
      <p style="margin:4px 0;"><strong>Makes own pieces:</strong> ${input.makesOwnPieces}</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">${brandName} is approved</h1>
      <p style="color:${SUB};margin:0;">Set up your account to start listing. This link expires in 7 days.</p>
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
    preheader: `An update on your Outfiqe application.`,
    bodyHtml: `
      <h1 style="font-size:20px;margin:0 0 4px;">Not quite a fit right now</h1>
      <p style="color:${SUB};margin:0;">
        We looked at ${brandName} and it isn't a fit for Outfiqe at the moment.
        ${reason ? reason : "You're welcome to apply again in the future."}
      </p>
    `,
  }),
});

export const creatorApprovedTemplate = (): { subject: string; html: string } => ({
  subject: "You're an approved Outfiqe creator",
  html: renderEmailLayout({
    preheader: "You're approved as an Outfiqe creator.",
    bodyHtml: `
      <h1 style="font-size:20px;margin:0 0 4px;">You're in</h1>
      <p style="color:${SUB};margin:0;">Your creator account is approved. You can now post fits and tag products.</p>
    `,
  }),
});

export const creatorRejectedTemplate = (): { subject: string; html: string } => ({
  subject: "About your Outfiqe creator application",
  html: renderEmailLayout({
    preheader: "An update on your creator application.",
    bodyHtml: `
      <h1 style="font-size:20px;margin:0 0 4px;">Not quite a fit right now</h1>
      <p style="color:${SUB};margin:0;">Your creator application isn't a fit at the moment. You're welcome to apply again later.</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">${productName} is live</h1>
      <p style="color:${SUB};margin:0;">Your listing is approved and now visible to shoppers.</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">Not quite ready to list</h1>
      <p style="color:${SUB};margin:0;">${productName} wasn't approved this time. You're welcome to update it and resubmit.</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">Order placed</h1>
      <p style="color:${SUB};margin:0;">Order ${input.orderId} — Rs. ${input.total.toLocaleString()} via ${input.paymentMethod}.</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">New order</h1>
      <p style="color:${SUB};margin:0;">Order ${input.orderId} — Rs. ${input.total.toLocaleString()}.</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">Payment received</h1>
      <p style="color:${SUB};margin:0;">Rs. ${input.total.toLocaleString()} received for order ${input.orderId}.</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">Manual refund needed</h1>
      <p style="color:${SUB};margin:0;">
        Order ${input.orderId} was paid (Rs. ${input.total.toLocaleString()}) but the item sold out before
        we could confirm it. Refund this order by hand through the gateway dashboard.
      </p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">Order cancelled</h1>
      <p style="color:${SUB};margin:0;">
        Order ${input.orderId} has been cancelled.${input.refunded ? ` Rs. ${input.total.toLocaleString()} has been refunded to you.` : ""}
      </p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">Automatic refund failed</h1>
      <p style="color:${SUB};margin:0;">
        Order ${input.orderId} was cancelled, but the automatic gateway refund of
        Rs. ${input.total.toLocaleString()} failed. Refund this order by hand.
      </p>
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
      <h1 style="font-size:20px;margin:0 0 12px;">New withdrawal request</h1>
      <p style="margin:4px 0;"><strong>From:</strong> ${input.ownerName} (${input.ownerType})</p>
      <p style="margin:4px 0;"><strong>Amount:</strong> Rs. ${input.amount}</p>
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
      <h1 style="font-size:20px;margin:0 0 4px;">Hi ${name}</h1>
      <p style="color:${SUB};margin:0;">You've been invited to the Outfiqe admin panel. This link expires in 7 days.</p>
      ${emailButtonHtml("Set up your admin account", inviteUrl)}
    `,
  }),
});
