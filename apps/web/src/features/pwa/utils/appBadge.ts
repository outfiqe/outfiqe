const NO_UNREAD = 0;

type BadgeCapableNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

const ignoreUnsupportedBadge = () => undefined;

export const showUnreadBadge = (unreadCount: number): void => {
  if (typeof navigator === "undefined") return;

  const badgeNavigator = navigator as BadgeCapableNavigator;

  if (unreadCount <= NO_UNREAD) {
    badgeNavigator.clearAppBadge?.().catch(ignoreUnsupportedBadge);
    return;
  }

  badgeNavigator.setAppBadge?.(unreadCount).catch(ignoreUnsupportedBadge);
};
