import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { AccountStatus, CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { decodeCursor } from "#lib/pagination.utils.js";
import { creatorLookService } from "#modules/creator-looks/creator-look.service.js";
import { redis } from "#redis/redis.client.js";
import { CREATOR_MOMENTUM_SCORE_CACHE_KEY, redisKeys } from "#redis/redis.keys.js";
import {
  authHeaderFor,
  createCreator,
  createLook,
  followUser,
  requestSuggestions,
} from "#test/integration/follow-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import type { SuggestionSnapshotCursor } from "../follow.types.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("GET /api/follows/suggested-creators", () => {
  it("ranks a mutual-follow candidate above an equally-popular stranger", async () => {
    const viewer = await createCreator("Suggestion Viewer", "suggestion-viewer");
    const candidateA = await createCreator("Mutual Candidate", "mutual-candidate", 100);
    const candidateB = await createCreator("Stranger Candidate", "stranger-candidate", 100);
    const fan = await createCreator("Momentum Fan", "momentum-fan-parity");

    for (const candidate of [candidateA, candidateB]) {
      const look = await createLook(candidate.id, "Equal momentum drop");
      await prisma.creatorLookLike.create({
        data: { creatorLookId: look.id, userId: fan.id },
      });
    }
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const connectors = await Promise.all([
      createCreator("Connector One", "connector-one"),
      createCreator("Connector Two", "connector-two"),
      createCreator("Connector Three", "connector-three"),
    ]);
    for (const connector of connectors) {
      await followUser(viewer.id, connector.id);
      await followUser(connector.id, candidateA.id);
    }

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(candidateA.id);
    expect(ids).toContain(candidateB.id);
    expect(ids.indexOf(candidateA.id)).toBeLessThan(ids.indexOf(candidateB.id));
  });

  it("excludes the viewer and muses already followed", async () => {
    const viewer = await createCreator("Excluding Viewer", "excluding-viewer", 50);
    const alreadyFollowed = await createCreator("Already Followed", "already-followed", 50);
    const discoverable = await createCreator("Discoverable Muse", "discoverable-creator", 50);
    await followUser(viewer.id, alreadyFollowed.id);

    await createLook(discoverable.id, "Discoverable drop");
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).not.toContain(viewer.id);
    expect(ids).not.toContain(alreadyFollowed.id);
  });

  it("falls back to the legacy popularity list when there's no signal and no scored momentum yet", async () => {
    const viewer = await createCreator("Cold Start Viewer", "cold-start-viewer");
    const onlyCreator = await createCreator("Only Muse", "only-creator", 5);

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(onlyCreator.id);
  });

  it("surfaces a muse through the momentum pool alone, with no personalization signal", async () => {
    const viewer = await createCreator("Discovery Viewer", "discovery-viewer");
    const someoneElse = await createCreator("Momentum Fan", "momentum-fan");
    const momentumCreator = await createCreator("Momentum Muse", "momentum-creator", 20);

    const look = await createLook(momentumCreator.id, "Momentum drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: look.id, userId: someoneElse.id },
    });
    await creatorLookService.runTrendingAggregation();
    const { ranked } = await creatorLookService.runCreatorMomentumScoring();
    expect(ranked.some((entry) => entry.creatorId === momentumCreator.id)).toBe(true);

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(momentumCreator.id);
  });

  it("surfaces a muse through topical hashtag affinity, without the viewer ever engaging with them directly", async () => {
    const viewer = await createCreator("Hashtag Viewer", "hashtag-viewer");
    const engagedCreator = await createCreator("Engaged Muse", "engaged-creator");
    const hashtagCreator = await createCreator("Hashtag Match Muse", "hashtag-match-creator");
    const marker = randomUUID().slice(0, 8);

    const engagedLook = await createLook(engagedCreator.id, `Engaged drop #shared${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: engagedLook.id, tag: `shared${marker}` },
    });
    await prisma.creatorLookLike.create({
      data: { creatorLookId: engagedLook.id, userId: viewer.id },
    });

    const hashtagLook = await createLook(hashtagCreator.id, `Unengaged drop #shared${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: hashtagLook.id, tag: `shared${marker}` },
    });

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(hashtagCreator.id);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/follows/suggested-creators");
    expect(response.status).toBe(401);
  });

  it("rejects a platform admin viewer", async () => {
    const admin = await createCreator("Admin Viewer", "admin-viewer");

    const response = await request(testApp)
      .get("/api/follows/suggested-creators")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(403);
  });

  it("paginates through the full ranked pool with a stable session snapshot, without repeating a muse", async () => {
    const viewer = await createCreator("Pagination Viewer", "pagination-viewer");
    const fan = await createCreator("Pagination Fan", "pagination-fan");
    const candidates = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createCreator(`Pagination Candidate ${index}`, `pagination-candidate-${index}`, index),
      ),
    );
    for (const candidate of candidates) {
      const look = await createLook(candidate.id, "Pagination drop");
      await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: fan.id } });
    }
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 2 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(first.status).toBe(200);
    expect(first.body.data.creators).toHaveLength(2);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 10, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    const firstIds: string[] = first.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    const secondIds: string[] = second.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    expect(secondIds.length).toBeGreaterThan(0);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it("resumes from where it left off instead of rewinding to page one when the session snapshot expires mid-scroll", async () => {
    const viewer = await createCreator("Resume Suggestions Viewer", "resume-suggestions-viewer");
    const strongFan = await createCreator("Resume Strong Fan", "resume-strong-fan");
    const weakFan = await createCreator("Resume Weak Fan", "resume-weak-fan");
    const extraFan = await createCreator("Resume Extra Fan", "resume-extra-fan");
    const topCandidate = await createCreator("Resume Top Candidate", "resume-top-candidate", 50);
    const secondCandidate = await createCreator(
      "Resume Second Candidate",
      "resume-second-candidate",
      10,
    );

    const topLook = await createLook(topCandidate.id, "Resume top drop");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: strongFan.id },
        { creatorLookId: topLook.id, userId: weakFan.id },
        { creatorLookId: topLook.id, userId: extraFan.id },
      ],
    });
    const secondLook = await createLook(secondCandidate.id, "Resume second drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: secondLook.id, userId: strongFan.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.status).toBe(200);
    expect(first.body.data.creators[0]?.id).toBe(topCandidate.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    const firstCursor = decodeCursor<SuggestionSnapshotCursor>(first.body.data.nextCursor);
    await redis.del(redisKeys.cache("suggested-creators-snapshot", firstCursor?.sessionId ?? ""));

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.creators[0]?.id).toBe(secondCandidate.id);
  });

  it("never suggests a muse through a fresh candidate-pool build once their account is banned", async () => {
    const viewer = await createCreator("Banned Pool Viewer", "banned-pool-viewer");
    const connectors = await Promise.all([
      createCreator("Banned Pool Connector One", "banned-pool-connector-one"),
      createCreator("Banned Pool Connector Two", "banned-pool-connector-two"),
      createCreator("Banned Pool Connector Three", "banned-pool-connector-three"),
    ]);
    const bannedCandidate = await createCreator(
      "Banned Pool Candidate",
      "banned-pool-candidate",
      50,
    );
    for (const connector of connectors) {
      await followUser(viewer.id, connector.id);
      await followUser(connector.id, bannedCandidate.id);
    }
    await prisma.user.update({
      where: { id: bannedCandidate.id },
      data: { accountStatus: AccountStatus.BANNED },
    });

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).not.toContain(bannedCandidate.id);
  });

  it("drops a muse from a cached suggestion snapshot once their account is banned mid-session", async () => {
    const viewer = await createCreator("Mid-Session Ban Viewer", "mid-session-ban-viewer");
    const strongFan = await createCreator("Mid-Session Ban Strong Fan", "mid-session-ban-strong");
    const weakFan = await createCreator("Mid-Session Ban Weak Fan", "mid-session-ban-weak");
    const topCandidate = await createCreator(
      "Mid-Session Ban Top Candidate",
      "mid-session-ban-top",
      50,
    );
    const soonBannedCandidate = await createCreator(
      "Mid-Session Ban Second Candidate",
      "mid-session-ban-second",
      10,
    );
    const topLook = await createLook(topCandidate.id, "Mid-session ban top drop");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: strongFan.id },
        { creatorLookId: topLook.id, userId: weakFan.id },
      ],
    });
    const secondLook = await createLook(soonBannedCandidate.id, "Mid-session ban second drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: secondLook.id, userId: strongFan.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.status).toBe(200);
    expect(first.body.data.creators[0]?.id).toBe(topCandidate.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    await prisma.user.update({
      where: { id: soonBannedCandidate.id },
      data: { accountStatus: AccountStatus.BANNED },
    });

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    const secondIds: string[] = second.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    expect(secondIds).not.toContain(soonBannedCandidate.id);
  });

  it("drops a muse from a cached suggestion snapshot once they're de-approved mid-session", async () => {
    const viewer = await createCreator("Mid-Session Reject Viewer", "mid-session-reject-viewer");
    const strongFan = await createCreator(
      "Mid-Session Reject Strong Fan",
      "mid-session-reject-strong",
    );
    const weakFan = await createCreator("Mid-Session Reject Weak Fan", "mid-session-reject-weak");
    const topCandidate = await createCreator(
      "Mid-Session Reject Top Candidate",
      "mid-session-reject-top",
      50,
    );
    const soonRejectedCandidate = await createCreator(
      "Mid-Session Reject Second Candidate",
      "mid-session-reject-second",
      10,
    );
    const topLook = await createLook(topCandidate.id, "Mid-session reject top drop");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: strongFan.id },
        { creatorLookId: topLook.id, userId: weakFan.id },
      ],
    });
    const secondLook = await createLook(soonRejectedCandidate.id, "Mid-session reject second drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: secondLook.id, userId: strongFan.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.status).toBe(200);
    expect(first.body.data.creators[0]?.id).toBe(topCandidate.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    await prisma.user.update({
      where: { id: soonRejectedCandidate.id },
      data: { creatorStatus: CreatorStatus.REJECTED },
    });

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    const secondIds: string[] = second.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    expect(secondIds).not.toContain(soonRejectedCandidate.id);
  });

  it("excludes a not-yet-approved or banned muse from the legacy fallback list, not just ranks them lower", async () => {
    const viewer = await createCreator("Legacy Filter Viewer", "legacy-filter-viewer");
    const pendingCreator = await prisma.user.create({
      data: {
        email: `legacy-pending-${randomUUID()}@outfiqe.test`,
        name: "Legacy Pending Muse",
        handle: `legacy-pending-${randomUUID().slice(0, 6)}`,
        phone: uniquePhone(),
        passwordHash: "not-used-in-tests",
        isCreator: true,
        creatorStatus: CreatorStatus.PENDING,
        followerCount: 1000,
      },
    });
    const bannedCreator = await createCreator("Legacy Banned Muse", "legacy-banned-creator", 1000);
    await prisma.user.update({
      where: { id: bannedCreator.id },
      data: { accountStatus: AccountStatus.BANNED },
    });
    const approvedCreator = await createCreator(
      "Legacy Approved Muse",
      "legacy-approved-creator",
      1,
    );

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(approvedCreator.id);
    expect(ids).not.toContain(pendingCreator.id);
    expect(ids).not.toContain(bannedCreator.id);
  });

  it("degrades gracefully to candidate generation without the momentum pool when its cache holds corrupted data", async () => {
    const viewer = await createCreator("Corrupt Cache Viewer", "corrupt-cache-viewer");
    const connectors = await Promise.all([
      createCreator("Corrupt Cache Connector One", "corrupt-cache-connector-one"),
      createCreator("Corrupt Cache Connector Two", "corrupt-cache-connector-two"),
    ]);
    const mutualCandidate = await createCreator(
      "Corrupt Cache Mutual Candidate",
      "corrupt-cache-mutual-candidate",
      5,
    );
    for (const connector of connectors) {
      await followUser(viewer.id, connector.id);
      await followUser(connector.id, mutualCandidate.id);
    }
    await redis.set(CREATOR_MOMENTUM_SCORE_CACHE_KEY, "not-valid-json");

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(mutualCandidate.id);
  });
});
