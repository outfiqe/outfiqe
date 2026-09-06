import { generateUuid } from "@outfiqe/utils";

import { getOrSeedLocalStorageValue } from "./localStorageValue";

const STORAGE_KEY = "outfiqe:session-id";

// One anonymous id per browser, used only to attribute tag-pill clicks back to a session
// for later attribution — never sent anywhere else, and never created on the server.
export const getSessionId = (): string => getOrSeedLocalStorageValue(STORAGE_KEY, generateUuid);
