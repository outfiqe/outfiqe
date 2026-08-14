import type { ExtendedError } from "socket.io";

import { isJWTPayload, verifyToken } from "#lib/verify-token.utils.js";
import type { AuthPrincipal } from "#types/token.types.js";

import type { AppSocket } from "./socket.types.js";

export const socketAuth = (socket: AppSocket, next: (err?: ExtendedError) => void) => {
  const { token } = socket.handshake.auth;
  const { data } = socket;

  if (typeof token !== "string" || !token) {
    data.auth = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    data.auth =
      isJWTPayload(decoded) && decoded.role
        ? ({ userId: decoded.sub, role: decoded.role } satisfies AuthPrincipal)
        : null;
  } catch {
    data.auth = null;
  }

  next();
};
