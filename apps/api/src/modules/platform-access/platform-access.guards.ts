import { requirePlatformRole } from "./platform-access.middleware.js";

export const platformGuards = {
  brandsRead: requirePlatformRole("platform:brands:read", "platform:brands:manage"),
  brandsManage: requirePlatformRole("platform:brands:manage"),
  catalogRead: requirePlatformRole("platform:catalog:read", "platform:catalog:manage"),
  catalogManage: requirePlatformRole("platform:catalog:manage"),
  ordersRead: requirePlatformRole("platform:orders:read", "platform:orders:manage"),
  ordersManage: requirePlatformRole("platform:orders:manage"),
  usersRead: requirePlatformRole("platform:users:read", "platform:users:manage"),
  usersManage: requirePlatformRole("platform:users:manage"),
  userSearch: requirePlatformRole(
    "platform:users:read",
    "platform:users:manage",
    "platform:gamification:manage",
    "platform:xp:manage",
  ),
  creatorsRead: requirePlatformRole("platform:creators:read", "platform:creators:manage"),
  creatorsManage: requirePlatformRole("platform:creators:manage"),
  reviewsModerate: requirePlatformRole("platform:reviews:moderate"),
  contentModerate: requirePlatformRole("platform:content:moderate"),
  financeRead: requirePlatformRole("platform:finance:read"),
  withdrawRead: requirePlatformRole("platform:withdraw:read", "platform:withdraw:manage"),
  withdrawManage: requirePlatformRole("platform:withdraw:manage"),
  teamManage: requirePlatformRole("platform:team:manage"),
} as const;
