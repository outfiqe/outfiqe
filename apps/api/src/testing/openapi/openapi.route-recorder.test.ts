import type { NextFunction, Request, Response } from "express";
import express, { Router } from "express";
import { describe, expect, it } from "vitest";

import { describeRouteHandler } from "#lib/route-docs.utils.js";

import { collectRecordedEndpoints, installRouteRecorder } from "./openapi.route-recorder.js";

const passThrough = (_req: Request, _res: Response, next: NextFunction) => next();
const requireSignIn = (_req: Request, _res: Response, next: NextFunction) => next();
describeRouteHandler(requireSignIn, { kind: "auth", isRequired: true });
const listOrders = (_req: Request, res: Response) => res.json({});
const cancelOrder = (_req: Request, res: Response) => res.json({});
const getHealth = (_req: Request, res: Response) => res.json({});

const buildRecordedApp = () => {
  installRouteRecorder();
  const orderRoutes = Router();
  orderRoutes.get("/", listOrders);
  orderRoutes.use(requireSignIn);
  orderRoutes.post("/:orderId/cancel", passThrough, cancelOrder);

  const app = express();
  app.get("/health", getHealth);
  app.use("/api/orders", orderRoutes);
  return app;
};

describe("collectRecordedEndpoints", () => {
  it("records full paths, methods and the source file of every route", () => {
    const endpoints = collectRecordedEndpoints(buildRecordedApp());

    expect(endpoints.map(({ method, expressPath }) => `${method} ${expressPath}`)).toEqual([
      "get /health",
      "get /api/orders",
      "post /api/orders/:orderId/cancel",
    ]);
    expect(endpoints[0]?.sourceFile).toBeUndefined();
  });

  it("applies router-level guards only to the routes added after them", () => {
    const endpoints = collectRecordedEndpoints(buildRecordedApp());
    const [, listEndpoint, cancelEndpoint] = endpoints;

    expect(listEndpoint?.handlers.map(({ name }) => name)).toEqual(["listOrders"]);
    expect(cancelEndpoint?.handlers.map(({ name }) => name)).toEqual([
      "requireSignIn",
      "passThrough",
      "cancelOrder",
    ]);
    expect(cancelEndpoint?.handlers[0]?.docs).toEqual({ kind: "auth", isRequired: true });
  });

  it("rejects something that is not an express app", () => {
    installRouteRecorder();
    expect(() => collectRecordedEndpoints({})).toThrow(/router internals/);
  });
});
