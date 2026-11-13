import { createApp } from "../../app.js";
import { installApiExampleRecorderWhenRequested } from "../openapi/openapi.example-recorder.js";

installApiExampleRecorderWhenRequested();

export const testApp = createApp();
