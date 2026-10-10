import type { ChatMemberReference, ChatSystemEvent } from "@outfiqe/types";

const YOU = "You";
const SINGLE_NAME = 1;

const joinNames = (members: ChatMemberReference[]): string => {
  const names = members.map(({ name }) => name);
  if (names.length <= SINGLE_NAME) return names.join("");
  return `${names.slice(0, -SINGLE_NAME).join(", ")} and ${names.at(-SINGLE_NAME)}`;
};

export const describeGroupEvent = (
  event: ChatSystemEvent,
  actorName: string,
  isMine: boolean,
): string => {
  const actor = isMine ? YOU : actorName;
  switch (event.type) {
    case "GROUP_CREATED":
      return `${actor} created the group`;
    case "GROUP_RENAMED":
      return `${actor} renamed the group to "${event.groupName}"`;
    case "MEMBERS_ADDED":
      return `${actor} added ${joinNames(event.members)}`;
    case "MEMBER_REMOVED":
      return `${actor} removed ${event.member.name}`;
    case "MEMBER_LEFT":
      return `${actor} left`;
    case "ADMIN_ASSIGNED":
      return `${actor} made ${event.member.name} an admin`;
    case "ADMIN_REMOVED":
      return `${actor} removed ${event.member.name} as an admin`;
    case "OUTFIT_EDITORS_ADDED":
      return `${actor} added ${joinNames(event.members)} to the build`;
    case "OUTFIT_ITEM_ADDED":
      return `${actor} added ${event.productName}`;
    case "OUTFIT_ITEM_SWAPPED":
      return `${actor} swapped in ${event.productName}`;
    case "OUTFIT_ITEM_REMOVED":
      return `${actor} removed ${event.productName}`;
    case "OUTFIT_EVERYONE_HAPPY":
      return "Everyone's happy. The build is ready to lock";
    case "OUTFIT_LOCKED":
      return `${actor} locked the build`;
    case "OUTFIT_UNLOCKED":
      return `${actor} unlocked the build`;
  }
};
