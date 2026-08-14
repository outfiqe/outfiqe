import { EventEmitter } from "node:events";

export const eventBus = new EventEmitter();

export const DomainEvents = {
  USER_CREATED: "user.created",
  USER_DELETED: "user.deleted",
  USER_EMAIL_VERIFIED: "user.email.verified",
  USER_PASSWORD_RESET: "user.password.reset",
  BRAND_OWNER_REGISTERED: "brand.owner.registered",
  ADMIN_REGISTERED: "admin.registered",
  LOOK_CREATED: "look.created",
  LOOK_LIKED: "look.liked",
  LOOK_SAVED: "look.saved",
  LOOK_COMMENTED: "look.commented",
  USER_FOLLOWED: "user.followed",
  USER_UNFOLLOWED: "user.unfollowed",
  BRAND_FOLLOWED: "brand.followed",
  BRAND_UNFOLLOWED: "brand.unfollowed",
} as const;
