import type { CreatorStatus, UserRole } from "#generated/prisma/enums.js";

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  replacedByTokenHash: string | null;
}

export interface BrandInviteRecord {
  id: string;
  brandId: string;
  brand: { name: string; avatarUrl: string | null };
  email: string;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export type BrandInviteInfo = {
  email: string;
  brandName: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  captchaToken?: string;
  remoteIp?: string;
};

export type RegisterBrandInput = {
  inviteToken: string;
  name: string;
  phone: string;
  password: string;
};

export type AdminInviteInfo = {
  email: string;
  name: string;
};

export type RegisterAdminInput = {
  inviteToken: string;
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
  handle: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
  hasPassword: boolean;
  hasPlatformAccess: boolean;
};

export type BrandAuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  brandId: string;
  hasPlatformAccess: boolean;
};

export type AuthSession = IssuedTokens & { user: AuthUser };
export type BrandAuthSession = IssuedTokens & { user: BrandAuthUser };
