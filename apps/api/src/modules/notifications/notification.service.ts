import { DomainEvents, eventBus } from "#events/event-bus.js";

import { notificationRepository } from "./notification.repository.js";
import type {
  CreateIndividualNotificationInput,
  NotificationRecord,
  RetractGroupActorInput,
  UpsertGroupInput,
} from "./notification.types.js";
import { toBroadcastPayload } from "./notification.utils.js";

const broadcastCreated = (record: NotificationRecord): Promise<void> =>
  eventBus.publish(DomainEvents.NOTIFICATION_CREATED, toBroadcastPayload(record));

const broadcastUpdated = (record: NotificationRecord): Promise<void> =>
  eventBus.publish(DomainEvents.NOTIFICATION_UPDATED, toBroadcastPayload(record));

export const notificationService = {
  /**
   * Single-recipient, ungrouped write (plan §5's "stays individual" types).
   * A no-op when the recipient muted this type, or when the actor would be
   * notifying themselves about their own action.
   */
  async notifyIndividual(input: CreateIndividualNotificationInput): Promise<void> {
    if (input.actorId && input.actorId === input.recipientId) return;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const record = await notificationRepository.createIndividual(input);
    await broadcastCreated(record);
  },

  /**
   * Fan-out write for a batch of individual notifications that all share
   * one `type` (admin fan-out, brand-membership fan-out) — one mute-check
   * query for the whole batch instead of one per recipient.
   */
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
      await broadcastCreated(record);
    }
  },

  /**
   * Groupable-type write (plan §4). Publishes `notification:created` for a
   * fresh group, `notification:updated` for a merge into an existing one.
   */
  async notifyGroup(input: UpsertGroupInput): Promise<void> {
    if (input.actorId === input.recipientId) return;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const { record, wasCreated } = await notificationRepository.upsertGroup(input);
    await (wasCreated ? broadcastCreated(record) : broadcastUpdated(record));
  },

  /** Unlike's retraction path. Silent when the group already closed (read) or was deleted. */
  async retractGroupActor(input: RetractGroupActorInput): Promise<void> {
    if (input.actorId === input.recipientId) return;

    const record = await notificationRepository.retractGroupActor(input);
    if (record) await broadcastUpdated(record);
  },
};
