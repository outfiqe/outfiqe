import {
  emailButtonHtml,
  emailEyebrow,
  emailHeading,
  emailInfoPanel,
  emailLede,
  emailMuted,
  emailStatusPill,
  emailSubheading,
  emailText,
  escapeHtml,
  paragraphsHtml,
  renderEmailLayout,
} from "./layout.js";

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
      ${emailLede("Thanks for reaching out. Our team will reply by email. You can also follow this in your account under Settings > Support.")}
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
