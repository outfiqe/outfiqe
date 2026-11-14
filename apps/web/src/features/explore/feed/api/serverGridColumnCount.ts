import "server-only";

import { headers } from "next/headers";
import { userAgent } from "next/server";

import { pickInitialExploreGridColumnCount } from "../utils/initialGridColumnCount";

export const readInitialExploreGridColumnCount = async (): Promise<number> => {
  const { device } = userAgent({ headers: await headers() });
  return pickInitialExploreGridColumnCount(device.type);
};
