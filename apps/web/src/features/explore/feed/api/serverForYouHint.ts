import "server-only";

import { cookies } from "next/headers";

import {
  FOR_YOU_HINT_DISMISSED_COOKIE_NAME,
  isForYouHintDismissedCookieValue,
} from "../utils/forYouHint";

export const hasDismissedForYouHintOnServer = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  return isForYouHintDismissedCookieValue(
    cookieStore.get(FOR_YOU_HINT_DISMISSED_COOKIE_NAME)?.value,
  );
};
