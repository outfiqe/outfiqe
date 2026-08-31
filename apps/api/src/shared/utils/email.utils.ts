import nodemailer from "nodemailer";

import { env } from "#config/env.config.js";

import logger from "./winston.utils.js";

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  html?: string;
};

const SMTP_IMPLICIT_TLS_PORT = 465;

const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: SMTP_IMPLICIT_TLS_PORT,
        secure: true,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

export const sendEmail = async ({ to, subject, body, html }: SendEmailInput): Promise<void> => {
  if (!transporter) {
    logger.warn(
      "SMTP_HOST/SMTP_USER/SMTP_PASS not set — falling back to console stub for outgoing email.",
    );
    logger.info(`[email] from=${env.MAIL_FROM} to=${to} subject="${subject}"\n${body}`);
    return;
  }

  try {
    await transporter.sendMail({ from: env.MAIL_FROM, to, subject, text: body, html });
  } catch (err) {
    logger.error(`Email send failed (to=${to}, subject="${subject}"): ${String(err)}`);
  }
};
