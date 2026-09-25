const MAX_BASE_LENGTH = 20;
const RANDOM_SUFFIX_MAX = 9999;

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;
export const HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

export const RESERVED_HANDLES = new Set([
  "admin",
  "support",
  "outfiqe",
  "help",
  "api",
  "root",
  "null",
  "undefined",
  "you",
  "me",
]);

// Slugifies a display name into a lowercase @handle base, e.g. "Aayusha Shrestha" -> "aayushashrestha".
export const slugifyHandle = (name: string): string => {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, MAX_BASE_LENGTH);

  return slug || "user";
};

// Appends a random numeric suffix so a colliding handle can be retried without a DB round trip per attempt.
export const withHandleSuffix = (base: string): string =>
  `${base}${Math.floor(Math.random() * RANDOM_SUFFIX_MAX)}`;

const MAX_HANDLE_COLLISION_ATTEMPTS = 5;
const FIRST_ATTEMPT_NUMBER = 1;

export class HandleCollisionError extends Error {
  constructor() {
    super("Every handle candidate was already taken.");
    this.name = "HandleCollisionError";
  }
}

export const runWithHandleCollisionRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  for (let attempt = FIRST_ATTEMPT_NUMBER; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable =
        error instanceof HandleCollisionError && attempt < MAX_HANDLE_COLLISION_ATTEMPTS;
      if (!isRetryable) throw error;
    }
  }
};
