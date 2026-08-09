import type { CreatorStatus } from "../../generated/prisma/enums.js";

export type CreatorProfile = {
  userId: string;
  name: string;
  email: string;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
};
