import { NotificationSurface, NotificationType } from "#generated/prisma/enums.js";

import type { NotificationMetadata } from "./notification.types.js";

export type NotificationTarget = {
  surface: NotificationSurface;
  path: string;
};

type ResolveNotificationTargetInput = {
  type: NotificationType;
  entityId: string | null;
  metadata: NotificationMetadata;
  recipientIsStaff?: boolean;
};

const WEB_ROUTES = {
  dashboardProfile: "/profile",
  badges: "/badges",
  progress: "/progress",
  earnings: "/earnings",
  wallet: "/wallet",
  manageOrders: "/manage-orders",
  ordersList: "/orders",
  brandProducts: "/products",
  messagesList: "/messages",
  supportList: "/support",
} as const;

const ADMIN_ROUTES = {
  brandApplications: "/platform/brand-applications",
  supportList: "/support",
  crmTasks: "/crm/tasks",
  crmSupport: "/crm/support",
  coupons: "/coupons",
  ordersList: "/orders",
} as const;

const web = (path: string): NotificationTarget => ({ surface: NotificationSurface.WEB, path });
const admin = (path: string): NotificationTarget => ({ surface: NotificationSurface.ADMIN, path });

const lookPermalink = (creatorHandle: string, lookId: string): string =>
  `/creator/${creatorHandle}?look=${lookId}`;

const ownLookTarget = (
  metadata: NotificationMetadata,
  entityId: string | null,
): NotificationTarget =>
  metadata.lookOwnerHandle && entityId
    ? web(lookPermalink(metadata.lookOwnerHandle, entityId))
    : web(WEB_ROUTES.dashboardProfile);

const supportTicketTarget = (
  entityId: string | null,
  recipientIsStaff: boolean,
): NotificationTarget => {
  if (recipientIsStaff) {
    return entityId
      ? admin(`${ADMIN_ROUTES.supportList}/${entityId}`)
      : admin(ADMIN_ROUTES.supportList);
  }
  return entityId
    ? web(`${WEB_ROUTES.supportList}?ticket=${entityId}`)
    : web(WEB_ROUTES.supportList);
};

export const resolveNotificationTarget = ({
  type,
  entityId,
  metadata,
  recipientIsStaff = false,
}: ResolveNotificationTargetInput): NotificationTarget | null => {
  switch (type) {
    case NotificationType.LOOK_LIKED:
    case NotificationType.LOOK_COMMENTED:
    case NotificationType.COMMENT_REPLIED:
      return ownLookTarget(metadata, entityId);
    case NotificationType.NEW_FOLLOWER: {
      const followerHandle = metadata.recentActors?.[0]?.handle ?? metadata.actor?.handle;
      return followerHandle ? web(`/creator/${followerHandle}`) : web(WEB_ROUTES.dashboardProfile);
    }
    case NotificationType.NEW_BRAND_FOLLOWER:
      return web(WEB_ROUTES.dashboardProfile);
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return web(WEB_ROUTES.badges);
    case NotificationType.LEVEL_UP:
      return web(WEB_ROUTES.progress);
    case NotificationType.COMMISSION_EARNED:
      return web(WEB_ROUTES.earnings);
    case NotificationType.NEW_ORDER:
      return web(WEB_ROUTES.manageOrders);
    case NotificationType.ORDER_STATUS_CHANGED:
      return entityId ? web(`${WEB_ROUTES.ordersList}/${entityId}`) : web(WEB_ROUTES.ordersList);
    case NotificationType.PRODUCT_REVIEWED:
      return web(WEB_ROUTES.brandProducts);
    case NotificationType.REVIEW_REQUESTED:
      return entityId ? web(`/product/${entityId}?review=write#reviews`) : null;
    case NotificationType.WITHDRAW_REQUEST_APPROVED:
    case NotificationType.WITHDRAW_REQUEST_REJECTED:
    case NotificationType.WITHDRAW_REQUEST_PAID:
      return web(WEB_ROUTES.wallet);
    case NotificationType.NEW_MESSAGE:
      return entityId
        ? web(`${WEB_ROUTES.messagesList}/${entityId}`)
        : web(WEB_ROUTES.messagesList);
    case NotificationType.SUPPORT_TICKET_REPLY:
    case NotificationType.SUPPORT_TICKET_RESOLVED:
      return supportTicketTarget(entityId, recipientIsStaff);
    case NotificationType.SUPPORT_TICKET_CREATED:
    case NotificationType.SUPPORT_TICKET_ASSIGNED:
      return supportTicketTarget(entityId, true);
    case NotificationType.BRAND_APPLICATION_SUBMITTED:
      return admin(ADMIN_ROUTES.brandApplications);
    case NotificationType.CRM_ITEM_ASSIGNED:
      return admin(
        metadata.crmItemKind === "task" ? ADMIN_ROUTES.crmTasks : ADMIN_ROUTES.crmSupport,
      );
    case NotificationType.COUPON_APPROVAL_REQUESTED:
    case NotificationType.COUPON_BUDGET_ALERT:
      return admin(ADMIN_ROUTES.coupons);
    case NotificationType.COUPON_REDEMPTION_FLAGGED:
      return entityId
        ? admin(`${ADMIN_ROUTES.ordersList}/${entityId}`)
        : admin(ADMIN_ROUTES.coupons);
    default:
      return null;
  }
};
