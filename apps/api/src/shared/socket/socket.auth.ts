import type { ExtendedError } from "socket.io";

import { isJWTPayload, verifyToken } from "#lib/verify-token.utils.js";

import type { AppSocket } from "./socket.types.js";

const UNAUTHORIZED_MESSAGE = "Authentication required.";

export const socketAuth = (socket: AppSocket, next: (err?: ExtendedError) => void) => {
  const { token } = socket.handshake.auth;

  if (typeof token !== "string" || !token) {
    return next(new Error(UNAUTHORIZED_MESSAGE));
  }

  try {
    const decoded = verifyToken(token);

    if (!isJWTPayload(decoded) || !decoded.role) {
      return next(new Error(UNAUTHORIZED_MESSAGE));
    }

    socket.data.auth = { userId: decoded.sub, role: decoded.role };
    next();
  } catch {
    next(new Error(UNAUTHORIZED_MESSAGE));
  }
};
