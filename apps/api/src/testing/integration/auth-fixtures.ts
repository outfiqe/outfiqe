import { randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";

import { addHours } from "date-fns/addHours";
import { subHours } from "date-fns/subHours";
import type request from "supertest";

import type { TokenPurpose } from "#constants/enums/auth.enum.js";
import { prisma } from "#db/prisma.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { signPurposeToken } from "#lib/purpose-token.utils.js";
import { BUILT_IN_ROLE_NAME } from "#modules/crm-access/crm-access.constants.js";

import { ensurePlatformOrganizationExists, seedTenantOrganization } from "./crm-fixtures.js";
import { uniquePhone } from "./unique-values.js";

export const DEFAULT_TEST_PASSWORD = "correct-horse-battery";
const DEFAULT_TOKEN_TTL = "1h";
export const EXPIRED_TOKEN_TTL = "-1h";
export const LEGACY_SCRYPT_KEY_LEN = 64;
const PASSWORD_UPGRADE_POLL_INTERVAL_MS = 25;
const PASSWORD_UPGRADE_POLL_ATTEMPTS = 40;
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const TEST_CSRF_TOKEN = "test-csrf-token";
export const csrfCookie = () => `csrf_token=${TEST_CSRF_TOKEN}`;

export const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForPasswordHashUpgrade = async (userId: string): Promise<string> => {
  for (let attempt = 0; attempt < PASSWORD_UPGRADE_POLL_ATTEMPTS; attempt += 1) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash?.startsWith("$argon2id$")) return user.passwordHash;
    await wait(PASSWORD_UPGRADE_POLL_INTERVAL_MS);
  }

  throw new Error(`Password hash for user ${userId} was not upgraded in time`);
};

export const mintPurposeToken = (
  userId: string,
  purpose: TokenPurpose,
  ttl = DEFAULT_TOKEN_TTL,
): string => signPurposeToken({ sub: userId, purpose }, ttl);

export const createUser = async (
  overrides: { emailVerified?: boolean; password?: string } = {},
) => {
  const suffix = randomUUID().slice(0, 8);
  const password = overrides.password ?? DEFAULT_TEST_PASSWORD;

  const user = await prisma.user.create({
    data: {
      email: `user-${suffix}@outfiqe.test`,
      name: "Test User",
      handle: `test-user-${suffix}`,
      phone: uniquePhone(),
      passwordHash: await hashPassword(password),
      emailVerified: overrides.emailVerified ?? true,
    },
  });

  return { user, password };
};

export const createUserHoldingHandle = async (handle: string) =>
  prisma.user.create({
    data: {
      email: `handle-holder-${randomUUID()}@outfiqe.test`,
      name: "Handle Holder",
      handle,
      phone: uniquePhone(),
      passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
      emailVerified: true,
    },
  });

export const registerBody = (overrides: Partial<Record<string, string>> = {}) => ({
  name: "Ava Martinez",
  email: `register-${randomUUID()}@outfiqe.test`,
  phone: uniquePhone(),
  password: DEFAULT_TEST_PASSWORD,
  confirmPassword: DEFAULT_TEST_PASSWORD,
  ...overrides,
});

export const findPlatformRoleId = async (roleName: string): Promise<string> => {
  const platformOrganization = await ensurePlatformOrganizationExists();
  const role = await prisma.role.findFirstOrThrow({
    where: { organizationId: platformOrganization.id, name: roleName },
  });
  return role.id;
};

export const createAdminInvite = async (
  overrides: { email?: string; name?: string; roleId?: string } = {},
) => {
  const { user: inviter } = await createUser();
  const rawToken = generateOpaqueToken();

  const roleId = overrides.roleId ?? (await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN));

  await prisma.adminInvite.create({
    data: {
      email: overrides.email ?? `admin-invite-${randomUUID()}@outfiqe.test`,
      name: overrides.name ?? "New Admin",
      roleId,
      tokenHash: hashToken(rawToken),
      expiresAt: addHours(new Date(), 1),
      invitedById: inviter.id,
    },
  });

  return rawToken;
};

export const createCrmInvite = async (overrides: { email?: string; expiresAt?: Date } = {}) => {
  const { organization, memberRole } = await seedTenantOrganization();
  const { user: inviter } = await createUser();
  const rawToken = generateOpaqueToken();

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: organization.id,
      email: overrides.email ?? `crm-invitee-${randomUUID()}@outfiqe.test`,
      roleId: memberRole.id,
      tokenHash: hashToken(rawToken),
      expiresAt: overrides.expiresAt ?? addHours(new Date(), 1),
      invitedById: inviter.id,
    },
  });

  return { rawToken, invite, organization, memberRole };
};

export const extractCookieValue = (
  response: request.Response,
  cookieName: string,
): string | undefined => {
  const rawCookies = response.headers["set-cookie"];
  const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  if (!match) return undefined;

  const valueWithAttributes = match.slice(cookieName.length + 1);
  return valueWithAttributes.split(";")[0];
};

export const insertRefreshToken = async (
  userId: string,
  {
    expired = false,
    revoked = false,
    familyId = randomUUID(),
  }: { expired?: boolean; revoked?: boolean; familyId?: string } = {},
) => {
  const rawToken = generateOpaqueToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      familyId,
      expiresAt: expired ? subHours(new Date(), 1) : addHours(new Date(), 1),
      revokedAt: revoked ? new Date() : null,
    },
  });

  return rawToken;
};
