import { brandApplicationRepository } from "./brandApplication.repository.js";

import { env } from "#config/env.config.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";

import type {
  BrandApplicationRecord,
  CreateBrandApplicationInput,
} from "./brandApplication.types.js";

export const brandApplicationService = {
  async submit(input: CreateBrandApplicationInput): Promise<BrandApplicationRecord> {
    const application = await brandApplicationRepository.create(input);

    await sendEmail({
      to: env.GMAIL_USER,
      subject: `New brand application: ${input.brandName}`,
      body: [
        `${input.brandName} — ${input.contactName}`,
        `Email: ${input.email}`,
        `Phone: ${input.phone}`,
        `Instagram: ${input.instagram}`,
        `Category: ${input.category}`,
        `Makes own pieces: ${input.makesOwnPieces}`,
        "",
        `To approve: pnpm --filter @outfiqe/api create-invite ${application.id}`,
      ].join("\n"),
    });

    logger.info(`Brand application received: ${application.id}`);
    return application;
  },
};
