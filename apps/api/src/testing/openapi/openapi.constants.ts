import path from "node:path";

export const DOCUMENTED_HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

export const DOCUMENTED_PATH_PREFIX = "/api/";

export const API_PACKAGE_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
export const API_SOURCE_ROOT = path.join(API_PACKAGE_ROOT, "src");
export const OPENAPI_OUTPUT_DIR = path.join(API_PACKAGE_ROOT, "openapi");
export const OPENAPI_SPEC_FILE = path.join(OPENAPI_OUTPUT_DIR, "openapi.json");
export const OPENAPI_EXAMPLES_FILE = path.join(OPENAPI_OUTPUT_DIR, "examples.json");
export const OPENAPI_RECORDINGS_DIR = path.join(OPENAPI_OUTPUT_DIR, "recordings");

export const API_DOCS_TASK_WRITE = "write";
export const API_DOCS_TASK_RECORD = "record";
export const API_DOCS_TASK_MERGE = "merge";

export const REGENERATE_SPEC_COMMAND = "pnpm --filter @outfiqe/api docs:openapi";

export const LOCAL_API_SERVER_URL = "http://localhost:4000";
export const PRODUCTION_API_SERVER_URL = "https://api.outfiqe.com";

export const MULTIPART_HANDLER_NAME = "multerMiddleware";

export const WORD_CASE_OVERRIDES: Record<string, string> = {
  api: "API",
  cod: "COD",
  crm: "CRM",
  csv: "CSV",
  id: "ID",
  ids: "IDs",
  oauth: "OAuth",
  qr: "QR",
  sla: "SLA",
  url: "URL",
  xp: "XP",
};
