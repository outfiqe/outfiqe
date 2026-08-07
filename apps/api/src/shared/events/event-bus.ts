import { EventEmitter } from "node:events";

export const eventBus = new EventEmitter();

export const DomainEvents = {
  USER_CREATED: "user.created",
  USER_DELETED: "user.deleted",
  USER_EMAIL_VERIFIED: "user.email.verified",
  USER_PASSWORD_RESET: "user.password.reset",
  BRAND_OWNER_REGISTERED: "brand.owner.registered",
} as const;
