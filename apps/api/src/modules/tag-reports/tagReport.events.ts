import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { TagRejectionReason } from "#generated/prisma/enums.js";

import { TAG_REPORT_CONSUMER_GROUP } from "./tagReport.constants.js";
import { tagReportService } from "./tagReport.service.js";

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

export const registerTagReportEventConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAG_REJECTED,
    groupName: TAG_REPORT_CONSUMER_GROUP,
    handler: escalateCounterfeitTagRemoval,
  });

  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAG_REVOKED,
    groupName: TAG_REPORT_CONSUMER_GROUP,
    handler: escalateCounterfeitTagRemoval,
  });
};
