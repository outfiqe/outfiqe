import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { NotificationEntityType } from "#generated/prisma/enums.js";
import { NotificationType } from "#generated/prisma/enums.js";
import { buildCursorPage, encodeCursor } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import type { OrganizationRecord } from "#modules/crm-access/crm-access.types.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";

import {
  PLATFORM_STAFF_NOTIFICATION_PERMISSIONS,
  type PlatformStaffNotificationType,
  TENANT_STAFF_NOTIFICATION_PERMISSIONS,
  type TenantStaffNotificationType,
} from "./notification.constants.js";
import { notificationRepository } from "./notification.repository.js";
import { resolveNotificationTarget } from "./notification.targets.js";
import type {
  BroadcastNotificationInput,
  CreateIndividualNotificationInput,
  NotificationChannelChanges,
  NotificationFeedCursor,
  NotificationMetadata,
  NotificationOrganizationFilter,
  NotificationPage,
  NotificationPreferenceView,
  NotificationRecord,
  RetractGroupActorInput,
  StaffNotificationInput,
  UpsertGroupInput,
} from "./notification.types.js";
import { canReceiveNotificationType, toBroadcastPayload } from "./notification.utils.js";

const NOT_FOUND_STATUS = 404;

const broadcastCreated = (record: NotificationRecord): Promise<void> =>
  eventBus.publish(DomainEvents.NOTIFICATION_CREATED, toBroadcastPayload(record));

const broadcastUpdated = (record: NotificationRecord): Promise<void> =>
  eventBus.publish(DomainEvents.NOTIFICATION_UPDATED, toBroadcastPayload(record));

const notifyOrganizationPermissionHolders = async (
  organization: OrganizationRecord,
  permissionKeys: readonly string[],
  input: StaffNotificationInput,
): Promise<void> => {
  const recipientIds = await crmAccessRepository.findActiveMemberUserIdsHoldingAnyPermission(
    organization,
    permissionKeys,
  );
  await notificationService.notifyManyIndividual(
    recipientIds.map((recipientId) => ({
      ...input,
      recipientId,
      organizationId: organization.id,
    })),
  );
};

export const notificationService = {
  async notifyIndividual(input: CreateIndividualNotificationInput): Promise<void> {
    if (input.actorId && input.actorId === input.recipientId) return;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const record = await notificationRepository.createIndividual(input);
    if (record) await broadcastCreated(record);
  },

  async notifyManyIndividual(inputs: CreateIndividualNotificationInput[]): Promise<void> {
    const firstInput = inputs[0];
    if (!firstInput) return;

    const recipientIds = inputs.map((input) => input.recipientId);
    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      recipientIds,
      firstInput.type,
    );

    for (const input of inputs) {
      if (input.actorId && input.actorId === input.recipientId) continue;
      if (mutedRecipientIds.has(input.recipientId)) continue;

      const record = await notificationRepository.createIndividual(input);
      if (record) await broadcastCreated(record);
    }
  },

  async notifyPlatformStaff(
    input: StaffNotificationInput & { type: PlatformStaffNotificationType },
  ): Promise<void> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) return;

    await notifyOrganizationPermissionHolders(
      platformOrganization,
      PLATFORM_STAFF_NOTIFICATION_PERMISSIONS[input.type],
      input,
    );
  },

  async notifyPlatformStaffMember(
    recipientId: string,
    input: StaffNotificationInput,
  ): Promise<void> {
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    await notificationService.notifyIndividual({
      ...input,
      recipientId,
      organizationId: platformOrganization?.id ?? null,
    });
  },

  async notifyTenantStaff(
    organizationId: string,
    input: StaffNotificationInput & { type: TenantStaffNotificationType },
  ): Promise<void> {
    const organization = await crmAccessRepository.findOrganizationById(organizationId);
    if (!organization) return;

    await notifyOrganizationPermissionHolders(
      organization,
      TENANT_STAFF_NOTIFICATION_PERMISSIONS[input.type],
      {
        ...input,
        metadata: {
          ...input.metadata,
          crmOrganizationName: organization.name,
          crmOrganizationSubdomain: organization.subdomain,
          crmOrganizationIsPlatformOrg: organization.isPlatformOrg,
        },
      },
    );
  },

  async clearOrganizationNotificationsFor(userId: string, organizationId: string): Promise<void> {
    await notificationRepository.deleteForRecipientInOrganization(userId, organizationId);
  },

  async notifyBroadcast(input: BroadcastNotificationInput): Promise<number> {
    if (input.recipientIds.length === 0) return 0;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      input.recipientIds,
      input.type,
    );
    const eligibleRecipientIds = input.recipientIds.filter(
      (recipientId) => !mutedRecipientIds.has(recipientId),
    );
    if (eligibleRecipientIds.length === 0) return 0;

    const target = resolveNotificationTarget({
      type: input.type,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    });

    const records = await notificationRepository.createManyForBroadcast(
      eligibleRecipientIds.map((recipientId) => ({
        recipientId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        targetSurface: target?.surface ?? null,
        targetPath: target?.path ?? null,
        metadata: input.metadata,
      })),
    );

    for (const record of records) await broadcastCreated(record);
    return records.length;
  },

  async notifyGroup(input: UpsertGroupInput): Promise<void> {
    if (input.actorId === input.recipientId) return;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const result = await notificationRepository.upsertGroup(input);
    if (!result) return;

    await (result.wasCreated ? broadcastCreated(result.record) : broadcastUpdated(result.record));
  },

  async notifySystemReminder(input: {
    recipientId: string;
    type: NotificationType;
    entityType?: NotificationEntityType | null;
    entityId?: string | null;
    groupKey: string;
    metadata: NotificationMetadata;
  }): Promise<void> {
    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const result = await notificationRepository.upsertSystemReminder(input);
    if (!result) return;

    await (result.wasCreated ? broadcastCreated(result.record) : broadcastUpdated(result.record));
  },

  async retractGroupActor(input: RetractGroupActorInput): Promise<void> {
    if (input.actorId === input.recipientId) return;

    const record = await notificationRepository.retractGroupActor(input);
    if (record) await broadcastUpdated(record);
  },

  async listFeed(
    recipientId: string,
    params: NotificationOrganizationFilter & { cursor?: string; limit: number },
  ): Promise<NotificationPage> {
    const rows = await notificationRepository.listForRecipient(recipientId, params);
    const { items, nextCursor } = buildCursorPage(rows, params.limit, (row) =>
      encodeCursor<NotificationFeedCursor>({ updatedAt: row.updatedAt.toISOString(), id: row.id }),
    );
    return { notifications: items, nextCursor };
  },

  async getUnreadCount(
    recipientId: string,
    filter: NotificationOrganizationFilter = {},
  ): Promise<number> {
    return notificationRepository.countUnread(recipientId, filter);
  },

  async markRead(recipientId: string, notificationId: string): Promise<void> {
    const record = await notificationRepository.markRead(recipientId, notificationId);
    if (!record) throw new AppError("NOT_FOUND", "Notification not found.", NOT_FOUND_STATUS);

    try {
      getIO().to(userRoom(recipientId)).emit(SOCKET_EVENTS.NOTIFICATION_READ, { id: record.id });
    } catch (error) {
      logger.error(
        `Failed to broadcast notification:read for user ${recipientId}: ${describeError(error)}`,
      );
    }
  },

  async markAllRead(
    recipientId: string,
    filter: NotificationOrganizationFilter = {},
  ): Promise<void> {
    const readAt = await notificationRepository.markAllRead(recipientId, filter);

    try {
      getIO()
        .to(userRoom(recipientId))
        .emit(SOCKET_EVENTS.NOTIFICATION_READ_ALL, {
          readAt: readAt.toISOString(),
          ...(filter.organizationId ? { organizationId: filter.organizationId } : {}),
        });
    } catch (error) {
      logger.error(
        `Failed to broadcast notification:read-all for user ${recipientId}: ${describeError(error)}`,
      );
    }
  },

  async listPreferences(userId: string): Promise<NotificationPreferenceView[]> {
    const [overrides, audience] = await Promise.all([
      notificationRepository.listPreferenceOverrides(userId),
      notificationRepository.findRecipientAudience(userId),
    ]);
    const receivableTypes = Object.values(NotificationType).filter((type) =>
      canReceiveNotificationType(type, audience),
    );
    return receivableTypes.map((type) => ({
      type,
      enabled: overrides.get(type)?.enabled ?? true,
      pushEnabled: overrides.get(type)?.pushEnabled ?? true,
    }));
  },

  async setPreference(
    userId: string,
    type: NotificationType,
    changes: NotificationChannelChanges,
  ): Promise<void> {
    await notificationRepository.setPreference(userId, type, changes);
  },
};
