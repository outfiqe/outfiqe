import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  createAdminSession,
  createRoleLimitedStaffSession,
} from "#test/integration/auth-helpers.js";
import { testApp } from "#test/integration/test-app.js";

import { PLATFORM_SETTING_REGISTRY } from "./platform-settings.registry.js";
import { platformSettingsService } from "./platform-settings.service.js";

const SETTINGS_PATH = "/api/platform/settings";
const ITEMS_PER_BOARD_KEY = "outfit.maxItemsPerBoard";
const { defaultValue: defaultItemsPerBoard, maximum: maxItemsPerBoard } =
  PLATFORM_SETTING_REGISTRY[ITEMS_PER_BOARD_KEY];
const CHANGED_ITEMS_PER_BOARD = 9;

const findSetting = (settings: { key: string }[], key: string) =>
  settings.find((setting) => setting.key === key);

beforeEach(() => {
  platformSettingsService.invalidate();
});

describe("platform settings API", () => {
  it("lists every setting at its default before anything is saved", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp).get(SETTINGS_PATH).set("Authorization", authHeader);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(findSetting(response.body.data, ITEMS_PER_BOARD_KEY)).toMatchObject({
      value: defaultItemsPerBoard,
      defaultValue: defaultItemsPerBoard,
      isOverridden: false,
      updatedAt: null,
    });
  });

  it("saves a new value, serves it to the rest of the app and audits the old and new value", async () => {
    const { authHeader, userId } = await createAdminSession();

    const response = await request(testApp)
      .put(`${SETTINGS_PATH}/${ITEMS_PER_BOARD_KEY}`)
      .set("Authorization", authHeader)
      .send({ value: CHANGED_ITEMS_PER_BOARD });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data).toEqual({
      key: ITEMS_PER_BOARD_KEY,
      before: defaultItemsPerBoard,
      after: CHANGED_ITEMS_PER_BOARD,
    });
    expect(await platformSettingsService.get(ITEMS_PER_BOARD_KEY)).toBe(CHANGED_ITEMS_PER_BOARD);

    const auditEntry = await prisma.platformAuditLog.findFirstOrThrow({
      where: { actorUserId: userId, targetId: ITEMS_PER_BOARD_KEY },
    });
    expect(auditEntry.metadata).toEqual({
      key: ITEMS_PER_BOARD_KEY,
      before: defaultItemsPerBoard,
      after: CHANGED_ITEMS_PER_BOARD,
    });
  });

  it("refuses a value outside the setting's range with a message naming the range", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .put(`${SETTINGS_PATH}/${ITEMS_PER_BOARD_KEY}`)
      .set("Authorization", authHeader)
      .send({ value: maxItemsPerBoard + 1 });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.message).toBe(
      `Items per board must be a whole number from 1 to ${maxItemsPerBoard}.`,
    );
  });

  it("refuses a change that would break a rule between two settings", async () => {
    const { authHeader } = await createAdminSession();
    await request(testApp)
      .put(`${SETTINGS_PATH}/outfit.minItemsToLock`)
      .set("Authorization", authHeader)
      .send({ value: 4 });

    const response = await request(testApp)
      .put(`${SETTINGS_PATH}/${ITEMS_PER_BOARD_KEY}`)
      .set("Authorization", authHeader)
      .send({ value: 3 });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.message).toMatch(/Items needed to lock/);
    expect(await platformSettingsService.get(ITEMS_PER_BOARD_KEY)).toBe(defaultItemsPerBoard);
  });

  it("puts a setting back to its default", async () => {
    const { authHeader } = await createAdminSession();
    await request(testApp)
      .put(`${SETTINGS_PATH}/${ITEMS_PER_BOARD_KEY}`)
      .set("Authorization", authHeader)
      .send({ value: CHANGED_ITEMS_PER_BOARD });

    const response = await request(testApp)
      .delete(`${SETTINGS_PATH}/${ITEMS_PER_BOARD_KEY}`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data).toMatchObject({
      before: CHANGED_ITEMS_PER_BOARD,
      after: defaultItemsPerBoard,
    });
    expect(await prisma.appSetting.count()).toBe(0);
  });

  it("rejects an unknown setting and extra fields in the body", async () => {
    const { authHeader } = await createAdminSession();

    const unknownKey = await request(testApp)
      .put(`${SETTINGS_PATH}/outfit.notASetting`)
      .set("Authorization", authHeader)
      .send({ value: 1 });
    const extraField = await request(testApp)
      .put(`${SETTINGS_PATH}/${ITEMS_PER_BOARD_KEY}`)
      .set("Authorization", authHeader)
      .send({ value: 1, note: "sneaky" });

    expect(unknownKey.status).toBeGreaterThanOrEqual(400);
    expect(unknownKey.status).toBeLessThan(500);
    expect(extraField.status).toBeGreaterThanOrEqual(400);
    expect(extraField.status).toBeLessThan(500);
  });

  it("refuses staff whose role lacks platform:settings:manage", async () => {
    const { authHeader } = await createRoleLimitedStaffSession("platform:metrics:read");

    const response = await request(testApp)
      .put(`${SETTINGS_PATH}/${ITEMS_PER_BOARD_KEY}`)
      .set("Authorization", authHeader)
      .send({ value: CHANGED_ITEMS_PER_BOARD });

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe("platformSettingsService.get", () => {
  it("ignores a stored value that is no longer valid and serves the default", async () => {
    await prisma.appSetting.create({ data: { key: ITEMS_PER_BOARD_KEY, value: "lots" } });
    platformSettingsService.invalidate();

    expect(await platformSettingsService.get(ITEMS_PER_BOARD_KEY)).toBe(defaultItemsPerBoard);
  });
});
