import nodemailer from "nodemailer";

import { env } from "#config/env.config.js";

import logger from "./winston.utils.js";

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

const transporter = env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    })
  : null;

export const sendEmail = async ({ to, subject, body }: SendEmailInput): Promise<void> => {
  if (!transporter) {
    logger.warn("GMAIL_APP_PASSWORD not set — falling back to console stub for outgoing email.");
    logger.info(`[email] from=${env.GMAIL_USER} to=${to} subject="${subject}"\n${body}`);
    return;
  }

  try {
    await transporter.sendMail({ from: env.GMAIL_USER, to, subject, text: body });
  } catch (err) {
    logger.error(`Gmail send failed (to=${to}, subject="${subject}"): ${String(err)}`);
  }
};
