const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export const VISITS_BEFORE_SUGGESTING_INSTALL = 2;

export const DAYS_BEFORE_ASKING_TO_INSTALL_AGAIN = 14;

export const INSTALL_PROMPT_COOLDOWN_MS =
  DAYS_BEFORE_ASKING_TO_INSTALL_AGAIN * MILLISECONDS_PER_DAY;

export const VISIT_COUNT_STORAGE_KEY = "outfiqe-visit-count";

export const INSTALL_PROMPT_DISMISSED_AT_STORAGE_KEY = "outfiqe-install-prompt-dismissed-at";

const FIRST_VISIT = 1;
const NO_STORED_VALUE = 0;

const readNumber = (key: string): number => {
  try {
    return Number(localStorage.getItem(key)) || NO_STORED_VALUE;
  } catch {
    return NO_STORED_VALUE;
  }
};

const ignoreBlockedStorage = () => undefined;

const writeNumber = (key: string, value: number): void => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    ignoreBlockedStorage();
  }
};

export const recordAppVisit = (): number => {
  const nextCount = readNumber(VISIT_COUNT_STORAGE_KEY) + FIRST_VISIT;
  writeNumber(VISIT_COUNT_STORAGE_KEY, nextCount);
  return nextCount;
};

export const hasVisitedOftenEnough = (): boolean =>
  readNumber(VISIT_COUNT_STORAGE_KEY) >= VISITS_BEFORE_SUGGESTING_INSTALL;

export const rememberInstallPromptDismissed = (now: Date = new Date()): void => {
  writeNumber(INSTALL_PROMPT_DISMISSED_AT_STORAGE_KEY, now.getTime());
};

export const isWithinInstallPromptCooldown = (now: Date = new Date()): boolean => {
  const dismissedAt = readNumber(INSTALL_PROMPT_DISMISSED_AT_STORAGE_KEY);
  if (!dismissedAt) return false;
  return now.getTime() - dismissedAt < INSTALL_PROMPT_COOLDOWN_MS;
};
