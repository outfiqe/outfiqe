const STORAGE_KEY = "outfiqe:session-id";

// One anonymous id per browser, used only to attribute tag-pill clicks back to a session
// for later attribution — never sent anywhere else, and never created on the server.
export const getSessionId = (): string => {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
};
