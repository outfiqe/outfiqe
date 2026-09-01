import type { NextFunction, Request, Response } from "express";

import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { platformImpersonationRepository } from "./platform-impersonation.repository.js";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const GET_AUDIT_SAMPLE_RATE = 0.05;
const LAST_SEEN_THROTTLE_MS = 60_000;

const lastSeenTouchedAt = new Map<string, number>();

const routeTemplate = (req: Request): string => {
  const mountPath = req.baseUrl || "";
  const routePath =
    typeof req.route?.path === "string" ? req.route.path : req.path.replace(mountPath, "");
  return `${mountPath}${routePath}`;
};

const touchLastSeen = (sessionId: string): void => {
  const now = Date.now();
  const previous = lastSeenTouchedAt.get(sessionId) ?? 0;
  if (now - previous < LAST_SEEN_THROTTLE_MS) return;
  lastSeenTouchedAt.set(sessionId, now);
  void platformImpersonationRepository.touchLastSeen(sessionId).catch(() => {});
};

export const impersonationRequestAudit = (req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    const principal = getAuthPrincipal(res);
    const impersonation = principal?.impersonation;
    if (!impersonation) return;

    touchLastSeen(impersonation.sessionId);

    const isStateChanging = !READ_METHODS.has(req.method);
    if (!isStateChanging && Math.random() > GET_AUDIT_SAMPLE_RATE) return;

    void platformAudit.record({
      actorUserId: impersonation.byUserId,
      onBehalfOfUserId: principal.userId,
      action: PLATFORM_AUDIT_ACTION.TENANT_REQUEST,
      summary: `${req.method} ${routeTemplate(req)} → ${res.statusCode}`,
      organizationId: impersonation.organizationId,
      impersonationSessionId: impersonation.sessionId,
      method: req.method,
      path: routeTemplate(req),
      statusCode: res.statusCode,
      ipAddress: req.ip ?? null,
    });
  });

  next();
};
