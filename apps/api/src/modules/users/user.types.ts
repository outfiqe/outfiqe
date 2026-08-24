import type { CreatorStatus, UserRole } from "#generated/prisma/enums.js";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  handle: string;
  phone: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
  creatorApprovedAt: Date | null;
  heightCm: number | null;
  showHeight: boolean;
  emailVerified: boolean;
  followerCount: number;
  followingCount: number;
  hideFromLeaderboards: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  phone: string;
  password: string;
  role?: UserRole;
  emailVerified?: boolean;
}

export type UpdateUserProfileInput = Partial<
  Pick<
    UserRecord,
    "name" | "phone" | "avatarUrl" | "heightCm" | "showHeight" | "hideFromLeaderboards"
  >
>;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
  emailVerified: boolean;
  createdAt: string;
}
