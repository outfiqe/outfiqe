import { registerAccountNotificationConsumers } from "./event-consumers/account.events.js";
import { registerCommerceNotificationConsumers } from "./event-consumers/commerce.events.js";
import { registerCrmNotificationConsumers } from "./event-consumers/crm.events.js";
import { registerGamificationNotificationConsumers } from "./event-consumers/gamification.events.js";
import { registerSocialNotificationConsumers } from "./event-consumers/social.events.js";
import { registerSupportNotificationConsumers } from "./event-consumers/support.events.js";
import { registerTagReviewNotificationConsumers } from "./event-consumers/tag-review.events.js";

export const registerNotificationEventConsumers = (): void => {
  registerAccountNotificationConsumers();
  registerSocialNotificationConsumers();
  registerGamificationNotificationConsumers();
  registerCommerceNotificationConsumers();
  registerCrmNotificationConsumers();
  registerSupportNotificationConsumers();
  registerTagReviewNotificationConsumers();
};
