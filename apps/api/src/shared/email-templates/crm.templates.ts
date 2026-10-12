import {
  emailButtonHtml,
  emailEyebrow,
  emailHeading,
  emailLede,
  emailMetaTable,
  emailStatusPill,
  renderEmailLayout,
} from "./layout.js";

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
