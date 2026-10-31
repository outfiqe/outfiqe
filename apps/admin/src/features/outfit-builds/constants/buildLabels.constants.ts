export const BUILD_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Building",
  LOCKED: "Locked",
  ARCHIVED: "Archived",
};

export const BUILD_VISIBILITY_LABEL: Record<string, string> = {
  PRIVATE: "Private",
  SHARED: "Shared",
  PUBLIC: "Public",
};

export const BUILD_ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
};

export const BUILD_PHOTO_STATUS_LABEL: Record<string, string> = {
  PROCESSING: "Processing",
  READY: "Ready",
  REMOVED: "Removed",
};

export const BUILD_EVENT_LABEL: Record<string, string> = {
  CREATED: "started the build",
  ITEM_ADDED: "added an item",
  ITEM_SWAPPED: "swapped an item",
  ITEM_REMOVED: "removed an item",
  EXTRAS_REORDERED: "reordered the extras",
  SETTINGS_CHANGED: "changed the settings",
  MEMBER_HAPPY: 'changed their "I\'m happy" choice',
  MEMBER_ADDED: "added someone to the build",
  MEMBER_REMOVED: "removed someone from the build",
  MEMBER_LEFT: "left the build",
  OWNERSHIP_TRANSFERRED: "handed the build to someone else",
  LOCKED: "locked the build",
  UNLOCKED: "unlocked the build",
  ARCHIVED: "archived the build",
  VISIBILITY_CHANGED: "changed who can see it",
  SHARED: "shared the build",
  PHOTO_ADDED: "added a photo",
  PHOTO_REMOVED: "removed a photo",
  COVERS_CHANGED: "changed the cover photos",
};

export const UNKNOWN_BUILD_EVENT_LABEL = "changed the build";
