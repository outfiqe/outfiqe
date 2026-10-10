import type { Message } from "@outfiqe/types";

import { describeGroupEvent } from "../utils/groupEventText";

export const SystemMessageLine = ({ message }: { message: Message }) => {
  if (!message.systemEvent) return null;

  return (
    <p className="flex justify-center py-1">
      <span className="rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
        {describeGroupEvent(message.systemEvent, message.sender.name, message.isMine)}
      </span>
    </p>
  );
};
