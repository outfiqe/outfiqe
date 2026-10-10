import { oauthLinkingService } from "./linking/linking.service.js";
import { oauthSignInService } from "./sign-in/sign-in.service.js";

export const oauthService = {
  ...oauthSignInService,

  ...oauthLinkingService,
};
