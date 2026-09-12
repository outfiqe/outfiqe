"use client";

import { useAccountSuspensionSocket } from "../hooks/useAccountSuspensionSocket";

export const AccountSuspensionSocketListener = () => {
  useAccountSuspensionSocket();
  return null;
};
