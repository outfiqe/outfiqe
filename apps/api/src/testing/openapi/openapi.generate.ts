import { buildOpenApiDocument } from "./openapi.builder.js";
import { collectRecordedEndpoints, installRouteRecorder } from "./openapi.route-recorder.js";
import { readSavedExamples, serializeJsonFile } from "./openapi.spec-file.js";

export const generateOpenApiSpec = async (): Promise<string> => {
  installRouteRecorder();
  const { createApp } = await import("../../app.js");
  const endpoints = collectRecordedEndpoints(createApp());
  return serializeJsonFile(buildOpenApiDocument(endpoints, readSavedExamples()));
};
