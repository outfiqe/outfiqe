import "../src/config/load-env.js";

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

import { FeatureFlagRollout, UserRole } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";
import { generateTokenpair } from "../src/shared/utils/generate-token-pair.utils.js";

const DEFAULT_BOARD_COUNT = 100;
const EDITORS_PER_BOARD = 4;
const DEFAULT_API_URL = "http://localhost:3000";
const OUTPUT_FILE = path.resolve(import.meta.dirname, "../load/outfit-boards.json");
const LOAD_USER_EMAIL_DOMAIN = "load.outfiqe.test";
const PHONE_DIGITS = 8;
const CREATED_STATUS = 201;
const OK_STATUS = 200;

type LoadBoard = { outfitId: string; tokens: string[] };

const readBoardCount = (): number => {
  const boardsArgument = process.argv.find((argument) => argument.startsWith("--boards="));
  const requestedCount = Number(boardsArgument?.split("=")[1]);
  return Number.isInteger(requestedCount) && requestedCount > 0
    ? requestedCount
    : DEFAULT_BOARD_COUNT;
};

const createLoadUser = async (label: string) => {
  const suffix = randomUUID().slice(0, PHONE_DIGITS);
  const user = await prisma.user.create({
    data: {
      email: `${label}-${suffix}@${LOAD_USER_EMAIL_DOMAIN}`,
      name: `Load ${label}`,
      handle: `load-${label}-${suffix}`,
      phone: `97${suffix.replace(/\D/g, "1").padEnd(PHONE_DIGITS, "1").slice(0, PHONE_DIGITS)}`,
      passwordHash: "load-test-only",
      role: UserRole.CUSTOMER,
    },
  });
  const { accessToken } = generateTokenpair({ sub: user.id, role: user.role });
  return { id: user.id, token: accessToken };
};

const callApi = async (
  apiUrl: string,
  token: string,
  method: "POST",
  apiPath: string,
  body: unknown,
  version?: number,
) => {
  const response = await fetch(`${apiUrl}/api${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
      ...(version === undefined ? {} : { "If-Match": `"${version}"` }),
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  return { status: response.status, payload };
};

const readBoardIdAndVersion = (payload: unknown): { id: string; version: number } | null => {
  if (typeof payload !== "object" || payload === null || !("data" in payload)) return null;
  const { data } = payload;
  if (typeof data !== "object" || data === null) return null;
  const board = "board" in data ? data.board : data;
  if (typeof board !== "object" || board === null) return null;
  if (!("id" in board) || !("version" in board)) return null;
  const { id, version } = board;
  return typeof id === "string" && typeof version === "number" ? { id, version } : null;
};

const main = async () => {
  const apiUrl = process.env.LOAD_API_URL ?? DEFAULT_API_URL;
  const boardCount = readBoardCount();
  await prisma.featureFlag.upsert({
    where: { key: "outfit_builder" },
    create: { key: "outfit_builder", rollout: FeatureFlagRollout.EVERYONE },
    update: { rollout: FeatureFlagRollout.EVERYONE },
  });

  const boards: LoadBoard[] = [];
  for (let boardIndex = 0; boardIndex < boardCount; boardIndex += 1) {
    const owner = await createLoadUser("owner");
    const editors = await Promise.all(
      Array.from({ length: EDITORS_PER_BOARD }, () => createLoadUser("editor")),
    );
    const created = await callApi(apiUrl, owner.token, "POST", "/outfits", {});
    const board = readBoardIdAndVersion(created.payload);
    if (created.status !== CREATED_STATUS || !board) {
      throw new Error(`Starting a load board failed with ${created.status}`);
    }
    const invited = await callApi(
      apiUrl,
      owner.token,
      "POST",
      `/outfits/${board.id}/members`,
      { userIds: editors.map(({ id }) => id) },
      board.version,
    );
    if (invited.status !== OK_STATUS) {
      throw new Error(`Inviting load editors failed with ${invited.status}`);
    }
    boards.push({
      outfitId: board.id,
      tokens: [owner.token, ...editors.map(({ token }) => token)],
    });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(boards));
  console.warn(`Created ${boards.length} load boards; wrote ${OUTPUT_FILE}`);
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
