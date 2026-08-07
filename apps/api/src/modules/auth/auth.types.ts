import type { CreatorStatus, UserRole } from "../../generated/prisma/enums.js";

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface BrandInviteRecord {
  id: string;
  brandId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type RegisterBrandInput = {
  inviteToken: string;
  name: string;
  phone: string;
  password: string;
};

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  refreshTokenTtlSeconds: number;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
};

export type BrandAuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  brandId: string;
};

export type AuthSession = IssuedTokens & { user: AuthUser };
export type BrandAuthSession = IssuedTokens & { user: BrandAuthUser };
