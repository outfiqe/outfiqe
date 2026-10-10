export const FOR_YOU_HINT_DISMISSED_STORAGE_KEY = "outfiqe-for-you-hint-dismissed";

const DISMISSED_VALUE = "1";

const ignoreBlockedStorage = () => undefined;

export const isForYouHintDismissed = (): boolean => {
  try {
    return localStorage.getItem(FOR_YOU_HINT_DISMISSED_STORAGE_KEY) === DISMISSED_VALUE;
  } catch {
    return false;
  }
};

export const rememberForYouHintDismissed = (): void => {
  try {
    localStorage.setItem(FOR_YOU_HINT_DISMISSED_STORAGE_KEY, DISMISSED_VALUE);
  } catch {
    ignoreBlockedStorage();
  }
};
