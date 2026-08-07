import type { CreatorStatus, UserRole } from "../../generated/prisma/enums.js";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
  emailVerified: boolean;
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

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
  emailVerified: boolean;
  createdAt: string;
}
