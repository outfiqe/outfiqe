import path from "node:path";

import express from "express";

import { readRouteHandlerDocs } from "#lib/route-docs.utils.js";

import { DOCUMENTED_HTTP_METHODS } from "./openapi.constants.js";
import type { RecordedEndpoint, RecordedHandler } from "./openapi.types.js";

type RouterLayer = { handle: unknown; name: string; route?: unknown; method?: string };
type RecordingRouter = { stack: RouterLayer[] };
type RecordingRoute = { path: unknown; stack: RouterLayer[]; methods: Record<string, boolean> };
type RouterPrototype = {
  use: (this: unknown, ...useArguments: unknown[]) => unknown;
  route: (this: unknown, routePath: unknown) => unknown;
};
type ScopedHandler = { pathPrefix: string; handler: RecordedHandler };

const ROOT_PATH = "/";
const ROUTE_SOURCE_FILE_PATTERN = /[\\/]apps[\\/]api[\\/]src[\\/]([^:()]+?\.ts)/;
const TEST_HARNESS_FOLDER = "testing/";
const UNSUPPORTED_EXPRESS_MESSAGE =
  "Express router internals changed, so the API docs route recorder can't read them.";

const mountPathByLayer = new WeakMap<object, string>();
const sourceFileByRoute = new WeakMap<object, string>();
let isRecorderInstalled = false;

const isObjectLike = (value: unknown): value is object =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const isRouterLayer = (value: unknown): value is RouterLayer =>
  isObjectLike(value) && "handle" in value && "name" in value && typeof value.name === "string";

const isRecordingRouter = (value: unknown): value is RecordingRouter =>
  isObjectLike(value) &&
  "stack" in value &&
  Array.isArray(value.stack) &&
  value.stack.every(isRouterLayer);

const isRecordingRoute = (value: unknown): value is RecordingRoute =>
  isRecordingRouter(value) && "path" in value && "methods" in value && isObjectLike(value.methods);

const isRouterPrototype = (value: unknown): value is RouterPrototype =>
  isObjectLike(value) &&
  Object.hasOwn(value, "use") &&
  "use" in value &&
  typeof value.use === "function" &&
  "route" in value &&
  typeof value.route === "function";

const readRouterStack = (router: unknown): RouterLayer[] => {
  if (!isRecordingRouter(router)) throw new Error(UNSUPPORTED_EXPRESS_MESSAGE);
  return router.stack;
};

const findRouteSourceFile = (callStack: string | undefined): string | undefined => {
  for (const stackFrame of callStack?.split("\n") ?? []) {
    const relativeSourceFile = ROUTE_SOURCE_FILE_PATTERN.exec(stackFrame)?.[1]?.replaceAll(
      "\\",
      "/",
    );
    if (relativeSourceFile && !relativeSourceFile.startsWith(TEST_HARNESS_FOLDER)) {
      return relativeSourceFile;
    }
  }
  return undefined;
};

const readRouterPrototype = (): RouterPrototype => {
  const routerInstance: unknown = Object.getPrototypeOf(express.Router());
  const routerPrototype: unknown = isObjectLike(routerInstance)
    ? Object.getPrototypeOf(routerInstance)
    : undefined;
  if (!isRouterPrototype(routerPrototype)) throw new Error(UNSUPPORTED_EXPRESS_MESSAGE);
  return routerPrototype;
};

export const installRouteRecorder = (): void => {
  if (isRecorderInstalled) return;

  const routerPrototype = readRouterPrototype();
  const { use: originalUse, route: originalRoute } = routerPrototype;

  routerPrototype.use = function recordMountPath(this: unknown, ...useArguments: unknown[]) {
    const stackLengthBefore = readRouterStack(this).length;
    const router = originalUse.apply(this, useArguments);
    const [firstArgument] = useArguments;
    const mountPath = typeof firstArgument === "string" ? firstArgument : ROOT_PATH;
    for (const addedLayer of readRouterStack(this).slice(stackLengthBefore)) {
      mountPathByLayer.set(addedLayer, mountPath);
    }
    return router;
  };

  routerPrototype.route = function recordRouteSourceFile(this: unknown, routePath: unknown) {
    const route = originalRoute.call(this, routePath);
    const sourceFile = findRouteSourceFile(new Error().stack);
    if (isObjectLike(route) && sourceFile) sourceFileByRoute.set(route, sourceFile);
    return route;
  };

  isRecorderInstalled = true;
};

const joinRoutePath = (basePath: string, childPath: string): string => {
  const joinedPath = path.posix.join(basePath, childPath);
  return joinedPath.length > ROOT_PATH.length && joinedPath.endsWith(ROOT_PATH)
    ? joinedPath.slice(0, -ROOT_PATH.length)
    : joinedPath;
};

const isPathWithinPrefix = (routePath: string, pathPrefix: string): boolean =>
  pathPrefix === ROOT_PATH || routePath === pathPrefix || routePath.startsWith(`${pathPrefix}/`);

const toRecordedHandler = ({ handle, name }: RouterLayer): RecordedHandler => ({
  name,
  docs: readRouteHandlerDocs(handle),
});

const toRouteEndpoints = (
  route: RecordingRoute,
  basePath: string,
  scopedHandlers: ScopedHandler[],
): RecordedEndpoint[] => {
  if (typeof route.path !== "string") return [];

  const expressPath = joinRoutePath(basePath, route.path);
  const inheritedHandlers = scopedHandlers
    .filter(({ pathPrefix }) => isPathWithinPrefix(expressPath, pathPrefix))
    .map(({ handler }) => handler);

  return DOCUMENTED_HTTP_METHODS.filter((method) => route.methods[method]).map((method) => ({
    method,
    expressPath,
    handlers: [
      ...inheritedHandlers,
      ...route.stack
        .filter((layer) => layer.method === undefined || layer.method === method)
        .map(toRecordedHandler),
    ],
    sourceFile: sourceFileByRoute.get(route),
  }));
};

const walkRouter = (
  router: RecordingRouter,
  basePath: string,
  inheritedHandlers: ScopedHandler[],
  endpoints: RecordedEndpoint[],
): void => {
  const scopedHandlers = [...inheritedHandlers];

  for (const layer of router.stack) {
    if (isRecordingRoute(layer.route)) {
      endpoints.push(...toRouteEndpoints(layer.route, basePath, scopedHandlers));
      continue;
    }

    const layerPath = joinRoutePath(basePath, mountPathByLayer.get(layer) ?? ROOT_PATH);
    if (isRecordingRouter(layer.handle)) {
      walkRouter(layer.handle, layerPath, scopedHandlers, endpoints);
      continue;
    }

    scopedHandlers.push({ pathPrefix: layerPath, handler: toRecordedHandler(layer) });
  }
};

export const collectRecordedEndpoints = (app: unknown): RecordedEndpoint[] => {
  if (!isRecorderInstalled) throw new Error("Call installRouteRecorder() before createApp().");

  const appRouter = isObjectLike(app) && "router" in app ? app.router : undefined;
  if (!isRecordingRouter(appRouter)) throw new Error(UNSUPPORTED_EXPRESS_MESSAGE);

  const endpoints: RecordedEndpoint[] = [];
  walkRouter(appRouter, ROOT_PATH, [], endpoints);
  return endpoints;
};
