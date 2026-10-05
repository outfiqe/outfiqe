import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const featuresOffByDefault = http.get("/api/feature-flags/mine", () =>
  HttpResponse.json({ success: true, message: "Features on for you.", data: { enabledKeys: [] } }),
);

export const mswServer = setupServer(featuresOffByDefault);
