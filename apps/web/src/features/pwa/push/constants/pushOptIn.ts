export const PUSH_PROMPT_DISMISSED_STORAGE_KEY = "outfiqe-push-prompt-dismissed";

export const PUSH_PROMPT_DISMISSED_VALUE = "1";

const ignoreBlockedStorage = () => undefined;

export const isPushPromptDismissed = (): boolean => {
  try {
    return localStorage.getItem(PUSH_PROMPT_DISMISSED_STORAGE_KEY) === PUSH_PROMPT_DISMISSED_VALUE;
  } catch {
    return false;
  }
};

export const rememberPushPromptDismissed = (): void => {
  try {
    localStorage.setItem(PUSH_PROMPT_DISMISSED_STORAGE_KEY, PUSH_PROMPT_DISMISSED_VALUE);
  } catch {
    ignoreBlockedStorage();
  }
};
