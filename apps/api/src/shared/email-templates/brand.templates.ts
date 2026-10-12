import {
  emailButtonHtml,
  emailDivider,
  emailEyebrow,
  emailHeading,
  emailLede,
  emailMetaTable,
  emailMuted,
  emailStatusPill,
  emailText,
  escapeHtml,
  paragraphsHtml,
  renderEmailLayout,
} from "./layout.js";

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
  subject: `You're approved: set up ${brandName} on Outfiqe`,
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
      ${emailLede(`${escapeHtml(brandName)} is active again. Listings are visible and fulfilment can resume.`)}
    `,
  }),
});
