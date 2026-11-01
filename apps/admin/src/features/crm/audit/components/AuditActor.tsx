import { Avatar } from "@outfiqe/design-system";

import type { AuditLogRow } from "../utils/auditEntries.utils";

const SYSTEM_ACTOR_LABEL = "System";

export const AuditActor = ({
  entry,
  onSelect,
}: {
  entry: AuditLogRow;
  onSelect: (entry: AuditLogRow) => void;
}) => {
  const { actorName, actorAvatarUrl } = entry;
  if (!actorName) return SYSTEM_ACTOR_LABEL;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(entry);
      }}
      className="inline-flex cursor-pointer items-center gap-2 rounded-md text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar name={actorName} imageUrl={actorAvatarUrl} size="sm" />
      {actorName}
    </button>
  );
};
