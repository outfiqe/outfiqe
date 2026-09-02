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
const EMAIL_DELIVERY_TIMEOUT_MS = 12_000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const smtpPort = env.SMTP_PORT ?? SMTP_IMPLICIT_TLS_PORT;

const smtpTransporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: smtpPort,
        secure: env.SMTP_SECURE ?? smtpPort === SMTP_IMPLICIT_TLS_PORT,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: EMAIL_DELIVERY_TIMEOUT_MS,
        greetingTimeout: EMAIL_DELIVERY_TIMEOUT_MS,
        socketTimeout: EMAIL_DELIVERY_TIMEOUT_MS,
      })
    : null;

const deliverViaResend = async ({ to, subject, body, html }: SendEmailInput): Promise<void> => {
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text: body, html }),
    signal: AbortSignal.timeout(EMAIL_DELIVERY_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
  }
};

const deliverViaSmtp = async (transporter: nodemailer.Transporter, input: SendEmailInput) => {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.body,
    html: input.html,
  });
};

const logToConsoleStub = ({ to, subject, body }: SendEmailInput): void => {
  logger.warn(
    "No email transport configured (RESEND_API_KEY / SMTP_*) — logging the message to the console instead.",
  );
  logger.info(`[email] from=${env.MAIL_FROM} to=${to} subject="${subject}"\n${body}`);
};

const deliver = async (input: SendEmailInput): Promise<void> => {
  if (env.RESEND_API_KEY) return deliverViaResend(input);
  if (smtpTransporter) return deliverViaSmtp(smtpTransporter, input);
  logToConsoleStub(input);
};

export const sendEmail = async (input: SendEmailInput): Promise<void> => {
  try {
    await deliver(input);
  } catch (err) {
    logger.error(`Email send failed (to=${input.to}, subject="${input.subject}"): ${String(err)}`);
  }
};
