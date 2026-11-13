import type { RouteDocsInfo } from "#types/route-docs.types.js";

const routeDocsByHandler = new WeakMap<object, RouteDocsInfo>();

export const describeRouteHandler = <Handler extends object>(
  handler: Handler,
  info: RouteDocsInfo,
): Handler => {
  routeDocsByHandler.set(handler, info);
  return handler;
};

export const readRouteHandlerDocs = (handler: unknown): RouteDocsInfo | undefined =>
  typeof handler === "function" ? routeDocsByHandler.get(handler) : undefined;
