import { authInviteService } from "./invites/invite.service.js";
import { authPasswordService } from "./password/password.service.js";
import { authRegistrationService } from "./registration/registration.service.js";
import { authSessionService } from "./session/session.service.js";

export const authService = {
  ...authSessionService,

  ...authRegistrationService,

  ...authPasswordService,

  ...authInviteService,
};
