import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const platformRolesErrors = {
  platformOrganizationNotFound: () =>
    new AppError(
      "PLATFORM_ORGANIZATION_NOT_FOUND",
      "The platform organization is not configured.",
      HTTP_STATUS.NOT_FOUND,
    ),

  roleNotFound: () => new AppError("ROLE_NOT_FOUND", "Role not found.", HTTP_STATUS.NOT_FOUND),

  roleInUse: () =>
    new AppError(
      "ROLE_IN_USE",
      "Reassign every member and pending invite off this role before deleting it.",
      HTTP_STATUS.CONFLICT,
    ),
};
