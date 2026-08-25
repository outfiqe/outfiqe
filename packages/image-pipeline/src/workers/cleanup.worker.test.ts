import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { purgeOrphanedTempFiles } from "./cleanup.worker.js";

let rootDir: string;

beforeEach(async () => {
  rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "image-pipeline-cleanup-"));
});

afterEach(async () => {
  await fs.rm(rootDir, { recursive: true, force: true });
});

const ONE_HOUR_MS = 60 * 60 * 1000;

const writeFileWithAge = async (relativePath: string, ageHours: number) => {
  const absolutePath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, "orphaned upload bytes");
  const ageMsAgo = new Date(Date.now() - ageHours * ONE_HOUR_MS);
  await fs.utimes(absolutePath, ageMsAgo, ageMsAgo);
};

describe("purgeOrphanedTempFiles", () => {
  it("deletes files older than the max age and keeps fresher ones", async () => {
    await writeFileWithAge("old-upload.jpg", 48);
    await writeFileWithAge("recent-upload.jpg", 1);

    const { deletedCount } = await purgeOrphanedTempFiles(rootDir, 24);

    expect(deletedCount).toBe(1);
    await expect(fs.access(path.join(rootDir, "old-upload.jpg"))).rejects.toThrow();
    await expect(fs.access(path.join(rootDir, "recent-upload.jpg"))).resolves.toBeUndefined();
  });

  it("recurses into nested directories", async () => {
    await writeFileWithAge(path.join("2026", "08", "25", "nested-old.jpg"), 72);

    const { deletedCount } = await purgeOrphanedTempFiles(rootDir, 24);

    expect(deletedCount).toBe(1);
  });

  it("returns zero deletions for a missing directory instead of throwing", async () => {
    const { deletedCount } = await purgeOrphanedTempFiles(path.join(rootDir, "does-not-exist"), 24);
    expect(deletedCount).toBe(0);
  });

  it("returns zero deletions when nothing is old enough", async () => {
    await writeFileWithAge("fresh.jpg", 0.1);
    const { deletedCount } = await purgeOrphanedTempFiles(rootDir, 24);
    expect(deletedCount).toBe(0);
  });
});
