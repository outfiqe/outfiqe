import {
  emailButtonHtml,
  emailDivider,
  emailEyebrow,
  emailHeading,
  emailLede,
  emailSecurityNote,
  emailStatusPill,
  emailText,
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
      ${emailSecurityNote("If you didn't request this, you can safely ignore this email. Your password won't change.")}
    `,
  }),
});

export const creatorApprovedTemplate = (): { subject: string; html: string } => ({
  subject: "You're an approved Outfiqe muse",
  html: renderEmailLayout({
    preheader: "You're approved as an Outfiqe muse.",
    bodyHtml: `
      ${emailStatusPill("Approved", "success")}
      ${emailHeading("You're in")}
      ${emailLede("Your muse account is approved. You can now drop fits and tag products.")}
    `,
  }),
});

export const creatorRejectedTemplate = (): { subject: string; html: string } => ({
  subject: "About your Outfiqe muse application",
  html: renderEmailLayout({
    preheader: "An update on your muse application.",
    bodyHtml: `
      ${emailHeading("Not quite a fit right now")}
      ${emailLede("Your muse application isn't a fit at the moment. You're welcome to apply again later.")}
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
