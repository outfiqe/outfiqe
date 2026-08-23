import { createHash } from "node:crypto";

import { env } from "#config/env.config.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

const SHA1_HEX_PREFIX_LENGTH = 5;
const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";

export const isPasswordBreached = async (password: string): Promise<boolean> => {
  if (!env.PASSWORD_BREACH_CHECK_ENABLED) return false;

  const sha1Hex = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1Hex.slice(0, SHA1_HEX_PREFIX_LENGTH);
  const suffix = sha1Hex.slice(SHA1_HEX_PREFIX_LENGTH);

  try {
    const response = await fetch(`${HIBP_RANGE_URL}${prefix}`);

    if (!response.ok) {
      logger.warn(`Password breach check returned status ${response.status}; failing open`);
      return false;
    }

    const body = await response.text();
    return body.split("\n").some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);
  } catch (err) {
    logger.warn(`Password breach check errored, failing open: ${describeError(err)}`);
    return false;
  }
};
