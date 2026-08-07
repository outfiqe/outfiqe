import { env } from "#config/env.config.js";

import logger from "./winston.utils.js";

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export const sendEmail = async ({ to, subject, body }: SendEmailInput): Promise<void> => {
  logger.info(`[email] from=${env.EMAIL_FROM} to=${to} subject="${subject}"\n${body}`);
};
