import { format } from "date-fns/format";

import { env } from "#config/env.config.js";
import {
  accountBannedTemplate,
  accountRestoredTemplate,
  accountSuspendedTemplate,
  brandRestoredTemplate,
  brandSuspendedTemplate,
} from "#email-templates/templates.js";
import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { sendEmail } from "#lib/email.utils.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

const SUSPENSION_NOTIFICATIONS_CONSUMER_GROUP = "suspension-notifications";
const EXPIRY_LABEL_FORMAT = "MMMM d, yyyy";

const supportUrl = `${env.FRONTEND_URL}/support`;

export const registerSuspensionNotificationEventConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.USER_SUSPENDED,
    groupName: SUSPENSION_NOTIFICATIONS_CONSUMER_GROUP,
    handler: async ({ userId, reason, expiresAt }): Promise<void> => {
      const user = await userRepository.findById(userId);
      if (!user) return;

      const { subject, html } = accountSuspendedTemplate({
        reason,
        expiresAtLabel: expiresAt ? format(new Date(expiresAt), EXPIRY_LABEL_FORMAT) : null,
        supportUrl,
      });
      await sendEmail({ to: user.email, subject, body: reason, html });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.USER_BANNED,
    groupName: SUSPENSION_NOTIFICATIONS_CONSUMER_GROUP,
    handler: async ({ userId, reason }): Promise<void> => {
      const user = await userRepository.findById(userId);
      if (!user) return;

      const { subject, html } = accountBannedTemplate({ reason, supportUrl });
      await sendEmail({ to: user.email, subject, body: reason, html });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.USER_UNSUSPENDED,
    groupName: SUSPENSION_NOTIFICATIONS_CONSUMER_GROUP,
    handler: async ({ userId }): Promise<void> => {
      const user = await userRepository.findById(userId);
      if (!user) return;

      const { subject, html } = accountRestoredTemplate();
      await sendEmail({ to: user.email, subject, body: subject, html });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_SUSPENDED,
    groupName: SUSPENSION_NOTIFICATIONS_CONSUMER_GROUP,
    handler: async ({ brandId, reason, expiresAt }): Promise<void> => {
      const [brand, ownerUserId] = await Promise.all([
        brandRepository.findById(brandId),
        brandRepository.findOwnerUserId(brandId),
      ]);
      if (!brand || !ownerUserId) return;

      const owner = await userRepository.findById(ownerUserId);
      if (!owner) return;

      const { subject, html } = brandSuspendedTemplate({
        brandName: brand.name,
        reason,
        expiresAtLabel: expiresAt ? format(new Date(expiresAt), EXPIRY_LABEL_FORMAT) : null,
        supportUrl,
      });
      await sendEmail({ to: owner.email, subject, body: reason, html });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_UNSUSPENDED,
    groupName: SUSPENSION_NOTIFICATIONS_CONSUMER_GROUP,
    handler: async ({ brandId }): Promise<void> => {
      const [brand, ownerUserId] = await Promise.all([
        brandRepository.findById(brandId),
        brandRepository.findOwnerUserId(brandId),
      ]);
      if (!brand || !ownerUserId) return;

      const owner = await userRepository.findById(ownerUserId);
      if (!owner) return;

      const { subject, html } = brandRestoredTemplate(brand.name);
      await sendEmail({ to: owner.email, subject, body: subject, html });
    },
  });
};
