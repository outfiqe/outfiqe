export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type UserRole = "CUSTOMER" | "BRAND_OWNER" | "ADMIN";
export type CreatorStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
