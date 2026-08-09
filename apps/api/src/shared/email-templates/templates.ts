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
  category: string;
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
      <p style="margin:4px 0;"><strong>Category:</strong> ${input.category}</p>
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
