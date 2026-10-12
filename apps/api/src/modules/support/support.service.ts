import { supportAgentService } from "./agent/agent.service.js";
import { supportRequesterService } from "./requester/requester.service.js";

export const supportService = {
  ...supportRequesterService,

  ...supportAgentService,
};
