import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { TagRejectionReason } from "#generated/prisma/enums.js";

import { TAG_REPORT_CONSUMER_GROUP } from "./tag-report.constants.js";
import { tagReportService } from "./tag-report.service.js";

type TagRemovalPayload = {
  tagId: string;
  creatorId: string;
  reason: TagRejectionReason;
  note: string | null;
};

export const escalateCounterfeitTagRemoval = async ({
  tagId,
  creatorId,
  reason,
  note,
}: TagRemovalPayload): Promise<void> => {
  if (reason !== TagRejectionReason.COUNTERFEIT_SUSPECTED) return;
  await tagReportService.recordCounterfeitEscalation(tagId, creatorId, note);
};

const subscribeToProductTagRejected = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAG_REJECTED,
    groupName: TAG_REPORT_CONSUMER_GROUP,
    handler: escalateCounterfeitTagRemoval,
  });
};

const subscribeToProductTagRevoked = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAG_REVOKED,
    groupName: TAG_REPORT_CONSUMER_GROUP,
    handler: escalateCounterfeitTagRemoval,
  });
};

export const registerTagReportEventConsumers = (): void => {
  subscribeToProductTagRejected();
  subscribeToProductTagRevoked();
};
