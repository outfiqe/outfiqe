import { isIP } from "node:net";

import type { NextFunction, Request, Response } from "express";

import { env } from "#config/env.config.js";
import { isSameSecretValue } from "#lib/secret-compare.utils.js";

const ORIGIN_SECRET_HEADER = "x-origin-secret";
const VISITOR_IP_HEADER = "x-vercel-forwarded-for";
const VISITOR_IP_SEPARATOR = ",";
const NOT_AN_IP_ADDRESS = 0;

const isRequestFromOurEdge = (req: Request): boolean => {
  const { ORIGIN_SECRET: originSecret } = env;
  const receivedSecret = req.get(ORIGIN_SECRET_HEADER);
  if (!originSecret || !receivedSecret) return false;
  return isSameSecretValue(originSecret, receivedSecret);
};

const readVisitorIp = (req: Request): string | undefined => {
  const [firstAddress = ""] = (req.get(VISITOR_IP_HEADER) ?? "").split(VISITOR_IP_SEPARATOR);
  const visitorIp = firstAddress.trim();
  return isIP(visitorIp) === NOT_AN_IP_ADDRESS ? undefined : visitorIp;
};

export const resolveClientIp = (req: Request, _res: Response, next: NextFunction) => {
  const visitorIp = isRequestFromOurEdge(req) ? readVisitorIp(req) : undefined;
  if (visitorIp) Object.defineProperty(req, "ip", { value: visitorIp });
  next();
};
